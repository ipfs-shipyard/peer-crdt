'use strict'

const EventEmitter = require('events')
const pull = require('pull-stream')
const pLimit = require('p-limit')
const defer = require('pull-defer').source
const pushable = require('pull-pushable')
const through = require('pull-through')
const once = require('once')

let ref = 0

class Log extends EventEmitter {
  constructor (id, store, authenticateFn, options) {
    super()
    this.setMaxListeners(Infinity)

    this._ref = ++ref
    this._id = id
    this._store = store
    this._authenticateFn = authenticateFn
    this._options = options
    this._limit = pLimit(1)
  }

  async append (value, auth, parents) {
    const encryptedValue = await this._encrypt(value)
    return this.appendEncrypted(encryptedValue, auth, parents)
  }

  appendEncrypted (encryptedValue, auth, parents) {
    return this._limit(() => this._append(encryptedValue, auth, parents))
  }

  async _append (value, auth, parents) {
    if (!auth && value !== null) {
      auth = await this._authenticateFn(value, parents)
    }

    const head = await this._store.getHead()
    if (!parents) {
      parents = head
    }
    if (!Array.isArray(parents)) {
      parents = [parents]
    }
    parents = parents.filter(Boolean)

    const entry = [value, auth, parents]
    let id = await this._store.put(entry)

    const diverges = head && (id !== head) && parents.indexOf(head) === -1
    if (!diverges) {
      await this._store.setHead(id)
      this.emit('new head', id)
    }
    return id
  }

  merge (otherHead) {
    return this._limit(() => this._merge(otherHead))
  }

  async _merge (otherHead) {
    const head = await this._store.getHead()
    if (otherHead === head) {
      return
    }
    const isDescendant = await this._isChildOf(head, otherHead)
    const isParent = await this._isChildOf(otherHead, head)
    const isConflict = !isDescendant && !isParent
    if (isConflict) {
      await this._append(null, null, [otherHead, head].sort())
    }
  }

  has (id) {
    return this._store.has(id)
  }

  get (id) {
    return this._store.get(id)
  }

  all () {
    return this.since()
  }

  since (ancestorId, including) {
    const visited = {}

    const ancestorStream = (id) => pull(
      pull.values([id]),
      pull.asyncMap((entryId, _callback) => {
        const callback = once(_callback)
        this._isChildOf(ancestorId, entryId)
          .then((isChild) => {
            const visit = !visited[entryId] && !isChild
            if (visit) {
              visited[entryId] = true
            }

            setImmediate(() => callback(null, visit && entryId))
          })
          .catch((err) => {
            setImmediate(() => callback(err))
          })
      }),
      this._entryStream(),
      pull.map((entry) => {
        let value
        if (entry && entry.value !== null && (including || entry.id !== ancestorId)) {
          value = pull.values([entry])
        } else {
          value = pull.empty()
        }

        if (!entry || !entry.parents.length) {
          // leaf: return value
          return [value]
        }

        const s = entry.parents
          .filter((parentId) => including || (ancestorId !== parentId))
          .map((parentId) => ancestorStream(parentId))

        if (including || entry.id !== ancestorId) {
          s.push(this._entryValueSourceStream(entry.id))
        }

        return s
      }),
      pull.flatten(), // flatten array
      pull.flatten()  // flatten stream
    )

    const d = defer()

    this.getHead()
      .then((head) => {
        setImmediate(() => {
          if (!head) {
            d.resolve(pull.empty())
          } else {
            d.resolve(ancestorStream(head))
          }
        })
      })
      .catch((err) => {
        d.abort(err)
      })

    return d
  }

  follow (since) {
    let last
    let hasMore = false
    let stopped = false
    const p = pushable()

    const onNewHead = () => {
      hasMore = true
    }
    this.on('new head', onNewHead)

    const pullSince = (since) => {
      const self = this
      pull(
        this.since(since),
        through(
          (entry) => {
            last = entry.id
            setImmediate(() => p.push(entry))
          },
          function (end) {
            if (hasMore) {
              hasMore = false
              pullSince(last)
            } else {
              if (!stopped) {
                self.once('new head', () => {
                  if (!stopped) {
                    pullSince(last)
                  }
                })
              }
            }
            this.queue(null)
          }
        ),
        pull.onEnd((err) => {
          if (err) {
            console.log('ERR:', err)
            p.end(err)
          }
        })
      )
    }

    pullSince(since)

    const pEnd = p.end

    p.end = () => {
      stopped = true
      this.removeListener('new head', onNewHead)
      pEnd.call(p)
    }

    return p
  }

  _entryStream () {
    return pull.asyncMap((entryId, _callback) => {
      if (!entryId) {
        return _callback()
      }
      const callback = once(_callback)
      this.get(entryId)
        .then((entry) => {
          if (!entry) {
            return callback(null)
          }
          let value = entry[0]
          if (this._options.decrypt) {
            this._decrypt(value)
              .then((decryptedValue) => {
                setImmediate(() => {
                  callback(null, {
                    id: entryId,
                    value: decryptedValue,
                    auth: entry[1],
                    parents: entry[2]
                  })
                })
              })
              .catch(callback)
          } else {
            setImmediate(() => {
              callback(null, {
                id: entryId,
                value: entry && entry[0],
                auth: entry && entry[1],
                parents: (entry && entry[2]) || []
              })
            })
          }
        })
        .catch(callback)
    })
  }

  _entryValueSourceStream (id) {
    return pull(
      pull.values([id]),
      this._entryStream()
    )
  }

  async _isChildOf (ancestorId, entryId) {
    if (!ancestorId) {
      return false
    }

    const ancestor = await this.get(ancestorId)
    if (!ancestor) {
      return false
    }

    const parents = ancestor[2]
    if (!parents.length) {
      return false
    }

    if (parents.indexOf(entryId) >= 0) {
      return true
    }

    return !!(await Promise.all(
      parents.map((parentId) => this._isChildOf(parentId, entryId)))).find(Boolean)
  }

  getHead () {
    return this._limit(() => this._store.getHead())
  }

  // Encrypt / Decrypt

  async _encrypt (value) {
    if (value === null) {
      return null
    }
    return this._options.encrypt(value)
  }

  async _decrypt (buffer) {
    if (buffer === null) {
      return null
    }
    return this._options.decrypt(Buffer.from(buffer))
  }
}

module.exports = createLog

function createLog (id, store, authenticate, options) {
  if (!id) {
    throw new Error('need log id')
  }

  if (typeof id !== 'string') {
    throw new Error('need log id to be a string')
  }

  if (!store) {
    throw new Error('need log store')
  }

  if (!options) {
    throw new Error('need options')
  }

  // if (typeof options.decrypt !== 'function') {
  //   throw new Error('need options.decrypt function')
  // }

  return new Log(id, store, authenticate, options)
}

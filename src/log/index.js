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
  constructor (id, store, signFn, options) {
    super()
    this.setMaxListeners(Infinity)

    this._ref = ++ref
    this._id = id
    this._store = store
    this._signFn = signFn
    this._options = options
    this._limit = pLimit(1)
    this._follows = new Set()
  }

  async append (value, auth, parents) {
    const encryptedValue = await this._encrypt(value)
    return this.appendEncrypted(encryptedValue, auth, parents)
  }

  appendEncrypted (encryptedValue, auth, parents) {
    return this._limit(() => this._append(encryptedValue, auth, parents))
  }

  async _append (value, auth, parents) {
    const head = await this._store.getHead()
    if (!parents) {
      parents = head
    }
    if (!Array.isArray(parents)) {
      parents = [parents]
    }
    parents = parents.filter(Boolean)

    if (!auth && value !== null) {
      auth = await this._signFn(value, parents || [])
    }

    const entry = [value, auth, parents]

    let id = await this._store.put(entry)
    const diverges = head && (id !== head) && parents.indexOf(head) === -1

    // before we resolve this promise,
    // we need to wait until all the follow streams have emitted
    // the new entry that we're about to insert.
    const waitForFlushed = !diverges && value !== null
    const flushed = waitForFlushed && this._onceFlushed(id)

    if (!diverges) {
      await this._store.setHead(id)
      this.emit('new head', id)
    }

    if (waitForFlushed) {
      await flushed
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

  async has (id) {
    const head = await this.getHead()
    if (head === id) {
      return true
    }
    return this._isChildOf(head, id)
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

    this._store.getHead()
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

    const onNewHead = (id) => {
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
            p.push(entry)
          },
          function (end) {
            if (hasMore) {
              hasMore = false
              pullSince(last)
            } else {
              if (!stopped) {
                self.once('new head', (id) => {
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

    const end = () => {
      stopped = true
      this.removeListener('new head', onNewHead)
      this._follows.delete(retStream)
      p.end()
    }

    const flushEmitter = new EventEmitter()

    const retStream = Object.assign(
      pull(
        p,
        pull.map((entry) => {
          setImmediate(() => flushEmitter.emit(entry.id))
          return entry
        })),
      {
        flushEmitter,
        end
      })

    this._follows.add(retStream)
    return retStream
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
          if (this._options.decryptAndVerify) {
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
    const [ancestor, entry] = await Promise.all([
      this.get(ancestorId),
      this.get(entryId)
    ])
    if (!ancestor || !entry) {
      // Don't bother traversing tree if we don't have either endpoint
      return false
    }

    let searchNodes = [ancestor]
    const seenIds = new Set()
    while (searchNodes.length > 0) {
      const current = searchNodes.shift()
      if (!current) {
        continue
      }

      const parentIds = current[2]
      if (parentIds.length === 0) {
        continue
      }

      if (parentIds.indexOf(entryId) >= 0) {
        return true
      }

      const unseenIds = parentIds.filter(id => !seenIds.has(id))
      const parents = await Promise.all(unseenIds.map(id => this.get(id)))
      for (const parentId of parentIds) {
        seenIds.add(parentId)
      }

      searchNodes = searchNodes.concat(parents)
    }

    return false
  }

  getHead () {
    return this._limit(() => this._store.getHead())
  }

  // Encrypt / Decrypt

  async _encrypt (value) {
    if (value === null) {
      return null
    }
    return this._options.signAndEncrypt(value)
  }

  async _decrypt (buffer) {
    if (buffer === null) {
      return null
    }
    return this._options.decryptAndVerify(Buffer.from(buffer))
  }

  async _onceFlushed (id) {
    if (!this._follows.size) {
      return
    }
    return Promise.all(
      Array.from(this._follows).map((follow) => this._onceFollowFlushed(follow, id)))
  }

  _onceFollowFlushed (follow, id) {
    return new Promise((resolve, reject) => {
      follow.flushEmitter.once(id, resolve)
    })
  }
}

module.exports = createLog

function createLog (id, store, sign, options) {
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

  return new Log(id, store, sign, options)
}

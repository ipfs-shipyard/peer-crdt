'use strict'

const EventEmitter = require('events')
const pull = require('pull-stream')
const pLimit = require('p-limit')
const defer = require('pull-defer').source
const once = require('once')

class Log extends EventEmitter {
  constructor (id, store, authenticateFn) {
    super()
    this._id = id
    this._store = store
    this._authenticateFn = authenticateFn
    this._limit = pLimit(1)
  }

  append (value, auth, parents) {
    return this._limit(() => this._append(value, auth, parents))
  }

  async _append (value, auth, parents) {
    if (!auth) {
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
    const id = await this._store.put(entry)

    const diverges = parents.length > 0 && parents.indexOf(head) === -1
    if (diverges) {
      return this._merge(id, head)
    }
    this.emit('new head', id)
    return id
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

  _entryStream () {
    return pull.asyncMap((entryId, _callback) => {
      const callback = once(_callback)
      this._store.get(entryId)
        .then((entry) => {
          callback(null, {
            id: entryId,
            value: entry && entry[0],
            auth: entry && entry[1],
            parents: (entry && entry[2]) || []
          })
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

    const ancestor = await this._store.get(ancestorId)
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

  _getHead () {
    return this._limit(() => this._store.getHead())
  }

  _merge (a, b) {
    return this._append(null, null, [a, b].sort())
  }
}

module.exports = createLog

function createLog (id, store, authenticate) {
  if (!id) {
    throw new Error('need log id')
  }

  if (typeof id !== 'string') {
    throw new Error('need log id to be a string')
  }

  if (!store) {
    throw new Error('need log store')
  }

  if (typeof authenticate !== 'function') {
    throw new Error('need authentication function')
  }

  return new Log(id, store, authenticate)
}

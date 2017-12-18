'use strict'

const EventEmitter = require('events')
const pull = require('pull-stream')
const pLimit = require('p-limit')
const defer = require('pull-defer').source

class Log extends EventEmitter {
  constructor (id, store) {
    super()
    this._id = id
    this._store = store
    this._limit = pLimit(1)
  }

  append (value, parents) {
    return this._limit(() => this._append(value, parents))
  }

  async _append (value, parents) {
    const head = await this._store.getHead()
    if (!parents) {
      parents = head
    }
    if (!Array.isArray(parents)) {
      parents = [parents]
    }
    parents = parents.filter(Boolean)

    const entry = [value, parents]
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
      pull.asyncMap((entryId, callback) => {
        this._isChildOf(ancestorId, entryId)
          .then((isChild) => {
            const visit = !visited[entryId] && !isChild
            if (visit) {
              visited[entryId] = true
            }

            callback(null, visit && entryId)
          })
          .catch((err) => {
            callback(err)
          })
      }),
      this._entryStream(),
      pull.map((entry) => {
        let value
        if (entry && entry.value !== null && (including || entry.id !== ancestorId)) {
          value = pull.values([entry.value])
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
      pull.flatten(), // flatten stream
      pull.filter((value) => value !== null)
    )

    const d = defer()

    this._store.getHead()
      .then((head) => {
        if (!head) {
          d.resolve(pull.empty())
        } else {
          d.resolve(ancestorStream(head))
        }
      })
      .catch((err) => {
        d.abort(err)
      })

    return d
  }

  _entryStream () {
    return pull.asyncMap((entryId, callback) => {
      this._store.get(entryId)
        .then((entry) => {
          callback(null, {
            id: entryId,
            value: entry && entry[0],
            parents: (entry && entry[1]) || []
          })
        })
        .catch(callback)
    })
  }

  _entryValueSourceStream (id) {
    return pull(
      pull.values([id]),
      this._entryStream(),
      pull.map((entry) => entry.value)
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

    const parents = ancestor[1]
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
    return this._append(null, [a, b].sort())
  }
}

module.exports = createLog

function createLog (id, store) {
  if (!id) {
    throw new Error('need log id')
  }

  if (typeof id !== 'string') {
    throw new Error('need log id to be a string')
  }

  if (!store) {
    throw new Error('need log store')
  }

  return new Log(id, store)
}

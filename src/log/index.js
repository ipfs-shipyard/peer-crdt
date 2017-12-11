'use strict'

const pull = require('pull-stream')

class Log {
  constructor (id) {
    this._id = id
    this._next = 0
    this._entries = []
  }

  async append (entry) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        this._entries.push(entry)
        resolve((this._entries + 1).toString())
      }, 1)
    })
  }

  since (id) {
    return pull.values(this._entries.slice(Number(id || 0)))
  }
}

module.exports = createLog

function createLog (id) {
  if (!id) {
    throw new Error('need log id')
  }

  if (typeof id !== 'string') {
    throw new Error('need log id to be a string')
  }

  return new Log(id)
}

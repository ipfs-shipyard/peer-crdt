'use strict'

class Log {
  constructor (id) {
    this._id = id
    this._next = 0
  }

  async append (entry) {
    return new Promise((resolve, reject) => {
      setTimeout(() => resolve((++this._next).toString()), 1)
    })
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

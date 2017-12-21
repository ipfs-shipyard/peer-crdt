'use strict'

const crypto = require('crypto')

class MemoryStore {
  constructor () {
    this._entries = {}
  }

  put (entry) {
    const serialized = JSON.stringify(entry)
    return hashFor(serialized).then((id) => {
      this._entries[id] = serialized
      return id
    })
  }

  get (id) {
    return new Promise((resolve, reject) => {
      setImmediate(() => {
        const serialized = this._entries[id]
        if (serialized) {
          resolve(JSON.parse(serialized))
        } else {
          resolve(null)
        }
      })
    })
  }

  setHead (head) {
    return new Promise((resolve, reject) => {
      setImmediate(() => {
        this._head = head
        resolve()
      })
    })
  }

  getHead () {
    return new Promise((resolve, reject) => {
      setImmediate(() => {
        resolve(this._head)
      })
    })
  }
}

module.exports = MemoryStore

async function hashFor (str) {
  return new Promise((resolve, reject) => {
    setImmediate(() => {
      resolve(crypto.createHash('sha256')
        .update(Buffer.from(str))
        .digest('hex'))
    })
  })
}

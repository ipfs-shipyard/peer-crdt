'use strict'

const crypto = require('crypto')

class MemoryStore {
  constructor () {
    this._entries = {}
  }

  put (_entry) {
    let value = _entry[0]
    const entry = [..._entry]
    if (value !== null) {
      value = Buffer.from(value).toString('hex')
      entry[0] = value
    }
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
          const entry = JSON.parse(serialized)
          let value = entry[0]
          if (value !== null) {
            value = Buffer.from(value, 'hex')
            entry[0] = value
          }
          resolve(entry)
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

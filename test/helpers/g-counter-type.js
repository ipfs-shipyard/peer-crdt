'use strict'

const pull = require('pull-stream')
const EventEmitter = require('events')

module.exports = (log) => {
  let value = 0

  const self = Object.assign(new EventEmitter(), {
    value () {
      return value
    },

    increment () {
      log.append(1)
    }
  })

  pull(
    log.follow(),
    pull.map((entry) => {
      if (entry.value) {
        value += entry.value
        self.emit('change')
      }
    }),
    pull.onEnd((err) => {
      throw err || new Error('follow stream should not have ended')
    })
  )

  return self
}

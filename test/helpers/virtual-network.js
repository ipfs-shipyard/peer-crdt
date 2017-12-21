'use strict'

const EventEmitter = require('events')

const DELAY = 50
const REPEAT_WANT_INTERVAL = 100
const network = new EventEmitter()
network.setMaxListeners(Infinity)

network.broadcast = (topic, message) => {
  setTimeout(() => network.emit(topic, message), DELAY)
}

network.get = (id) => {
  return new Promise((resolve, reject) => {
    const message = JSON.stringify(id)

    const interval = setInterval(() => {
      network.emit('want', message)
    }, REPEAT_WANT_INTERVAL)

    network.once(id, (message) => {
      clearInterval(interval)
      resolve(JSON.parse(message))
    })
    network.emit('want', message)
  })
}

module.exports = network

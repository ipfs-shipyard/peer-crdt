'use strict'

const EventEmitter = require('events')

const DELAY = 100
const network = new EventEmitter()
network.setMaxListeners(Infinity)

network.broadcast = (topic, message) => {
  setTimeout(() => network.emit(topic, message), DELAY)
}

network.get = (id) => {
  return new Promise((resolve, reject) => {
    network.emit('want', JSON.stringify(id))
    network.once(id, (message) => {
      resolve(JSON.parse(message))
    })
  })
}

module.exports = network

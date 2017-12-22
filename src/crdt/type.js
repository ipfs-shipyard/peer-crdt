'use strict'

const pull = require('pull-stream')
const EventEmitter = require('events')

module.exports = (type, log, network) => {
  if (typeof type.first !== 'function') {
    throw new Error('type should have a .first function')
  }

  if (typeof type.reduce !== 'function') {
    throw new Error('type should have a .reduce function')
  }

  let value = type.first()

  const mutators = type.mutators || {}
  const methods = {}
  Object.keys(mutators).forEach((mutatorName) => {
    // generate a mutator function to wrap the CRDT message generator
    const mutator = mutators[mutatorName]
    methods[mutatorName] = function () {
      const args = Array.prototype.slice.call(arguments)
      args.push(value)
      const message = mutator.apply(null, args)
      if (message !== undefined) {
        log.append(message)
      }
    }
  })

  const self = Object.assign(new EventEmitter(), methods, {
    _isPeerCRDT: true,
    network: network,
    value: () => type.valueOf(value)
  })

  self.setMaxListeners(Infinity)

  let lastEmitted = new Set()

  pull(
    log.follow(),
    pull.filter((entry) => entry.value !== undefined && entry.value !== null),
    pull.map((entry) => {
      if (lastEmitted.has(entry.id)) {
        return
      }

      lastEmitted.add(entry.id)
      value = type.reduce(entry.value, value)
      self.emit('change', entry.id)
    }),
    pull.onEnd((err) => {
      throw err || new Error('follow stream should not have ended')
    })
  )

  return self
}

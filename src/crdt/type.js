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

  let state = type.first()

  const mutators = type.mutators || {}
  const methods = {}
  Object.keys(mutators).forEach((mutatorName) => {
    // generate a mutator function to wrap the CRDT message generator
    const mutator = mutators[mutatorName]
    ensureMutatorIsFunction(mutator)
    methods[mutatorName] = (...args) => {
      const message = mutator.apply(state, args)
      if (message !== undefined) {
        if (typeof message === 'function') {
          pull(
            message,
            pull.collect((err, messages) => {
              if (err) { throw err }
              messages.forEach((message) => log.append(message))
            }))
        } else {
          log.append(message)
        }
      }
    }
  })

  const self = Object.assign(new EventEmitter(), methods, {
    _isPeerCRDT: true,
    network: network,
    value: () => type.valueOf(state)
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
      state = type.reduce(entry.value, state)
      self.emit('change', entry.id)
    }),
    pull.onEnd((err) => {
      throw err || new Error('follow stream should not have ended')
    })
  )

  return self
}

function ensureMutatorIsFunction (mutator) {
  if (typeof mutator !== 'function') {
    throw new Error('mutator should be a function')
  }
}

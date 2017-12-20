'use strict'

const pull = require('pull-stream')
const EventEmitter = require('events')
const deepEqual = require('deep-equal')

module.exports = (type, log, network) => {
  const initialValue = type[0]
  if (typeof initialValue !== 'function') {
    throw new Error('type should have an initial value function')
  }

  const newValueFromMessage = type[1]
  if (typeof newValueFromMessage !== 'function') {
    throw new Error('type should have a function to compute new value from message')
  }

  const mutators = type[2] || {}
  const methods = {}
  Object.keys(mutators).forEach((mutatorName) => {
    // generate a mutator function to wrap the CRDT message generator
    const mutator = mutators[mutatorName]
    methods[mutatorName] = function () {
      const message = mutator.apply(null, arguments)
      log.append(message)
    }
  })

  let value = initialValue()

  const self = Object.assign(new EventEmitter(), methods, {
    _isPeerCRDT: true,
    network: network,
    value () {
      return value
    }
  })

  pull(
    log.follow(),
    pull.map((entry) => {
      if (entry.hasOwnProperty('value')) {
        const newValue = newValueFromMessage(entry.value, value)
        if (!deepEqual(newValue, value)) {
          value = newValue
          self.emit('change')
        }
      }
    }),
    pull.onEnd((err) => {
      throw err || new Error('follow stream should not have ended')
    })
  )

  return self
}

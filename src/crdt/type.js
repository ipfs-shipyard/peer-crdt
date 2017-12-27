'use strict'

const pull = require('pull-stream')
const EventEmitter = require('events')
const cuid = require('cuid')

module.exports = (typeName, type, id, log, network, create) => {
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
    methods[mutatorName] = (..._args) => {
      const args = _args.map((arg) => resolveMutatorArg(arg))
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
    _peerCRDTId: id,
    _isPeerCRDT: true,
    _type: typeName,
    network: network,
    value: () => recursiveValue(type.valueOf(state)),
    createForEmbed
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
      const value = resolveReducerArg(entry.value)
      state = type.reduce(value, state)
      self.emit('change', entry.id)
    }),
    pull.onEnd((err) => {
      throw err || new Error('follow stream should not have ended')
    })
  )

  return self

  function createForEmbed (typeName, options) {
    const newId = id + '/' + cuid()
    const embeddable = create(typeName, newId, options)
    if (self.network.isStarted) {
      embeddable.network.start()
    } else {
      self.network.once('started', () => embeddable.network.start())
    }
    self.network.once('stopped', () => embeddable.network.stop())

    return embeddable
  }

  function resolveReducerArg (args) {
    if (args) {
      Object.keys(args).forEach((key, index) => {
        let value = args[key]
        if (!value) {
          return
        }
        if (Array.isArray(value)) {
          args[key] = resolveReducerArg(value)
        } else if (typeof value === 'object') {
          if (value._isPeerCRDT && value._peerCRDTId) {
            args[key] = reducerArgToCRDT(value)
          }
        }
      })
    }

    return args
  }

  function reducerArgToCRDT (value) {
    value = create(value._type, value._peerCRDTId)
    self.network.once('stopped', () => value.network.stop())
    if (self.network.isStarted) {
      value.network.start()
    } else {
      self.network.once('started', () => {
        value.network.start()
      })
    }

    value.on('change', () => self.emit('change'))

    return value
  }
}

function ensureMutatorIsFunction (mutator) {
  if (typeof mutator !== 'function') {
    throw new Error('mutator should be a function')
  }
}

function resolveMutatorArg (value) {
  if (value._isPeerCRDT) {
    value = {
      _isPeerCRDT: true,
      _peerCRDTId: value._peerCRDTId,
      _type: value._type
    }
  }
  return value
}

function recursiveValue (value) {
  if (!value) {
    return value
  }
  if (!Array.isArray(value) && (typeof value !== 'object')) {
    return value
  }

  Object.keys(value).forEach((key) => {
    const subValue = value[key]
    if (!subValue) {
      return
    }
    if (subValue._isPeerCRDT) {
      value[key] = recursiveValue(subValue.value())
    }
  })

  return value
}

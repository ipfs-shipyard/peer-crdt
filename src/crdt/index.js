'use strict'

const Log = require('../log')
const Compose = require('./compose')
const Type = require('./type')
const Network = require('./network')

const types = {}

module.exports = defaults()

function defaults (defaultOptions) {
  return {
    define: define,
    create: (type, id, options) => create(type, id, Object.assign({}, defaultOptions, options)),
    compose: (schema, options) => compose(schema, Object.assign({}, defaultOptions, options)),
    replicate: (id, options) => replicate(id, Object.assign({}, defaultOptions, options)),
    defaults: (moreDefaults) => defaults(Object.assign({}, defaultOptions, moreDefaults))
  }
}

function define (name, constructorFn) {
  if (types.hasOwnProperty(name)) {
    throw new Error('already defined ' + name)
  }

  types[name] = constructorFn
}

function create (typeName, id, options) {
  const type = types[typeName]
  if (!type) {
    throw new Error('unknown type ' + typeName)
  }

  if (!id) {
    throw new Error('need id')
  }

  if (!options || !options.network) {
    throw new Error('need options.network')
  }

  const log = Log(id, options.store(id), options.authenticate, options)
  const network = Network(id, log, options.network, options)
  const createDelegate = (typeName, id, moreOptions) => {
    return create(typeName, id, Object.assign({}, options, moreOptions))
  }

  return Type(typeName, type, id, log, network, createDelegate)
}

function compose (schema, options) {
  return Compose(create, schema, options)
}

function replicate (id, options) {
  if (!id) {
    throw new Error('need id')
  }

  if (!options) {
    throw new Error('need options')
  }

  const log = Log(id, options.store(id), null, options)
  const network = Network(id, log, options.network, options)

  return {
    network
  }
}

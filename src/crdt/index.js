'use strict'

const Log = require('../log')
const Compose = require('./compose')
const Type = require('./type')

const types = {}

module.exports = defaults()

function defaults (defaultOptions) {
  return {
    define: define,
    create: (type, id, options) => create(type, id, Object.assign({}, defaultOptions, options)),
    compose: (schema, options) => compose(schema, Object.assign({}, defaultOptions, options)),
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

  const log = Log(id, options.store(id), options.authenticate)

  return Type(log, type)
}

function compose (schema, options) {
  return Compose(create, schema, options)
}

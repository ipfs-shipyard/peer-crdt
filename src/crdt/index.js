'use strict'

const Log = require('../log')
const Compose = require('./compose')
const Type = require('./type')

const types = {}

exports.define = function define (name, constructorFn) {
  if (types.hasOwnProperty(name)) {
    throw new Error('already defined ' + name)
  }

  types[name] = constructorFn
}

exports.create = function create (typeName, id, options) {
  const type = types[typeName]
  if (!type) {
    throw new Error('unknown type ' + typeName)
  }

  if (!id) {
    throw new Error('need id')
  }

  const log = Log(id, options.store, options.authenticate)

  return Type(log, type)
}

exports.defaults = function defaults (defaultOptions) {
  return {
    create: (type, id, options) => exports.create(type, id, Object.assign({}, defaultOptions, options)),
    compose: (schema, options) => exports.compose(schema, Object.assign({}, defaultOptions, options)),
    defaults: (moreDefaults) => exports.defaults(Object.assign({}, defaultOptions, moreDefaults))
  }
}

exports.compose = function compose (schema, options) {
  return Compose(schema, options)
}

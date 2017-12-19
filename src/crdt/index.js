'use strict'

const Log = require('../log')

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

  return type(log)
}

exports.defaults = function defaults (defaultOptions) {
  return (type, id, options) => exports.create(type, id, Object.assign({}, defaultOptions, options))
}

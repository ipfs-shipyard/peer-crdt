'use strict'

const CRDT = require('./crdt')
require('./types').forEach((type) => {
  CRDT.define(type.name, type.def)
})

module.exports = CRDT

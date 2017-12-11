'use strict'

module.exports = Log

function Log (id) {
  if (!id) {
    throw new Error('need log id')
  }
}

'use strict'

const invert = require('./invert-buffer')

module.exports = async (value) => {
  return invert(Buffer.from(JSON.stringify(value)))
}

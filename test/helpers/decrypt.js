'use strict'

const invert = require('./invert-buffer')

module.exports = async (buffer) => {
  return JSON.parse(invert(buffer).toString())
}

'use strict'

const invert = require('./invert-buffer')

module.exports = async (buffer) => {
  const str = invert(buffer).toString().substring('somemagicstring'.length)
  return JSON.parse(str)
}

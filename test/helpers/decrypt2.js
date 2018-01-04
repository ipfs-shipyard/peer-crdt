'use strict'

const invert = require('./invert-buffer')

module.exports = async (buffer) => {
  const str = invert(buffer).toString().substring('somemagicstring'.length)
  console.log('str:', str)
  return JSON.parse(str)
}

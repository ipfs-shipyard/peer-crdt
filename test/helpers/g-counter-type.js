'use strict'

module.exports = [
  function initialValue () {
    return 0
  },
  function newValueFromMessage (message, previousValue) {
    return message + previousValue
  },
  {
    increment: () => 1
  }
]

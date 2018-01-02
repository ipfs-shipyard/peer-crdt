'use strict'

module.exports = {
  first: () => 0,
  reduce: (message, previous, changed) => {
    changed({ type: 'increment', by: message })
    return message + previous || 0
  },
  valueOf: (state) => state,
  mutators: {
    increment: () => 1
  }
}

'use strict'

module.exports = {
  first: () => 0,
  reduce: (message, previous, changed) => {
    changed({ type: 'increment', by: message })
    return message + previous
  },
  valueOf: (state) => state,
  mutators: {
    increment: () => 1
  }
}

'use strict'

module.exports = {
  first: () => new Set(),
  reduce: (message, previous, changed) => {
    changed({ type: 'add', value: message })
    return new Set([...previous, message])
  },
  valueOf: (state) => new Set([...state]),
  mutators: {
    add: (elem) => elem
  }
}

'use strict'

module.exports = {
  first: () => new Set(),
  reduce: (message, previous) => new Set([...previous, message]),
  valueOf: (state) => new Set([...state]),
  mutators: {
    add: (elem) => elem
  }
}

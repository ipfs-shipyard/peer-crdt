'use strict'

module.exports = {
  first: () => new Set(),
  reduce: (message, previous) => new Set([...previous, message]),
  valueOf: (state) => Array.from(state.values()),
  mutators: {
    add: (elem) => elem
  }
}

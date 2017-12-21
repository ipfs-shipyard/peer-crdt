'use strict'

module.exports = {
  first: () => new Set(),
  reduce: (message, previous) => previous.add(message),
  valueOf: (state) => Array.from(state.values()),
  mutators: {
    add: (elem) => elem
  }
}

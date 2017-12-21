'use strict'

module.exports = {
  first: () => 0,
  reduce: (message, previous) => message + previous,
  valueOf: (state) => state,
  mutators: {
    increment: () => 1
  }
}

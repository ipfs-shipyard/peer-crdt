'use strict'

module.exports = {
  first: () => 0,
  reduce: (message, previous) => message + previous,
  mutators: {
    increment: () => 1
  }
}

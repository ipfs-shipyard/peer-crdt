'use strict'

const GCounter = require('./g-counter')

module.exports = {
  first: () => [GCounter.first(), GCounter.first()],
  reduce: (message, previous) => [
    GCounter.reduce(message[0], previous[0]),
    GCounter.reduce(message[1], previous[1])
  ],
  valueOf: (state) => state[0] - state[1],
  mutators: {
    increment: () => [GCounter.mutators.increment(), null],
    decrement: () => [null, GCounter.mutators.increment()]
  }
}

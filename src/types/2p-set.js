'use strict'

const GSet = require('./g-set')

module.exports = {
  first: () => [GSet.first(), GSet.first()],
  reduce: (message, previous) => [
    GSet.reduce(message[0], previous[0]),
    GSet.reduce(message[1], previous[1])
  ],
  valueOf: (state) => {
    const tombstones = state[1]
    return new Set(Array.from(state[0]).filter((entry) => !tombstones.has(entry)))
  },
  mutators: {
    add: (elem) => [GSet.mutators.add(elem), null],
    remove: (elem) => [null, GSet.mutators.add(elem)]
  }
}

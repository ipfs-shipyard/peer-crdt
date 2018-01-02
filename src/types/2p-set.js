'use strict'

const GSet = require('./g-set')

module.exports = {
  first: () => [GSet.first(), GSet.first()],
  reduce: (message, previous, changed) => [
    GSet.reduce(message[0], previous[0], (event) => {
      changed({ type: 'add', value: event.value })
    }),
    GSet.reduce(message[1], previous[1], (event) => {
      changed({ type: 'remove', value: event.value })
    })
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

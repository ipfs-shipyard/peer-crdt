'use strict'

module.exports = {
  first: () => [new Map(), new Map()],
  reduce: (message, state) => {
    const add = message[0]

    if (add) {
      const adds = state[0]
      const [timestamp, elem] = add
      const previousTimestamp = adds.get(elem)
      if (!previousTimestamp || previousTimestamp < timestamp) {
        adds.set(elem, timestamp)
      }
    }

    const remove = message[1]

    if (remove) {
      const removes = state[1]
      const [timestamp, elem] = remove
      const previousTimestamp = removes.get(elem)
      if (!previousTimestamp || previousTimestamp < timestamp) {
        removes.set(elem, timestamp)
      }
    }

    return state
  },

  valueOf: (state) => {
    const adds = Array.from(state[0].entries())
    const removes = state[1]
    return new Set(adds
      .filter((add) => {
        const key = add[0]
        const addTs = add[1]
        return !removes.has(key) || removes.get(key) < addTs
      })
      .map((add) => add[0]))
  },

  mutators: {
    add: (elem) => [[timestamp(), elem], null],
    remove: (elem) => [null, [timestamp(), elem]]
  }
}

function timestamp () {
  return Date.now()
}

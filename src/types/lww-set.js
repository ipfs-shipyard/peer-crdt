'use strict'

module.exports = {
  first: () => [new Map(), new Map()],
  reduce: (message, state, changed) => {
    // console.log(message)
    const add = message[0]

    if (add) {
      const adds = state[0]
      const [timestamp, elem] = add
      const previousTimestamp = adds.get(elem)
      if (!previousTimestamp || (previousTimestamp < timestamp)) {
        changed({ type: 'add', value: elem })
        adds.set(elem, timestamp)
      }
    }

    const remove = message[1]

    if (remove) {
      const removes = state[1]
      const [timestamp, elem] = remove
      const previousTimestamp = removes.get(elem)
      if (!previousTimestamp || (previousTimestamp < timestamp)) {
        changed({ type: 'remove', value: elem })
        removes.set(elem, timestamp)
      }
    }

    // console.log('state:', state)
    return state
  },

  valueOf: (state) => {
    const adds = Array.from(state[0].entries())
    const removes = state[1]
    return new Set(adds
      .filter((add) => {
        const [key, addTs] = add
        return !(removes.has(key) && removes.get(key) >= addTs)
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

'use strict'

module.exports = {
  first: () => [new Map(), new Map()],
  reduce: (message, state) => {
    const [timestamps, values] = state
    const [timestamp, key, value] = message
    const previousTimestamp = timestamps.get(key)
    if (previousTimestamp && previousTimestamp === timestamp) {
      // same timestamp: we have to untie this by choosing the highest value
      const previousValue = values.get(key)
      const prevailingValue = [value, previousValue].sort()[1]
      const replace = prevailingValue === value
      if (replace) {
        timestamps.set(key, timestamp)
        values.set(key, value)
      }
      return state
    }
    const replace = !previousTimestamp || (previousTimestamp && previousTimestamp < timestamp)
    if (replace) {
      timestamps.set(key, timestamp)
      values.set(key, value)
    }
    return state
  },

  valueOf: (state) => {
    const values = state[1]
    return new Map([...values])
  },

  mutators: {
    set: (key, value) => [timestamp(), key, value]
  }
}

function timestamp () {
  return Date.now()
}

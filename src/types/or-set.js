'use strict'

const cuid = require('cuid')

module.exports = {
  first: () => [new Map(), new Set()],
  reduce: (message, previous) => {
    const add = message[0]
    if (add) {
      const tag = add[0]
      const value = add[1]
      previous[0].set(value, tag)
    }
    const remove = message[1]
    if (remove) {
      previous[1].add(remove)
    }
    return previous
  },

  valueOf: (state) => {
    const adds = Array.from(state[0].entries())
    const removes = state[1]
    return adds
      .filter((add) => {
        const tag = add[1]
        return !removes.has(tag)
      })
      .map((add) => add[0])
  },

  mutators: {
    add: (elem) => [[cuid(), elem], null],
    remove: (elem, state) => {
      const adds = state[0]
      const tag = adds.get(elem)
      if (tag) {
        return [null, tag]
      }
    }
  }
}

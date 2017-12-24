'use strict'

// Replicable Growable Array (RGA)
// State is represented by 3 sets:
//   * Added Vertices (VA)
//   * Removed Vertices (VR)
//   * Edges (E)
//
// As defined in http://hal.upmc.fr/inria-00555588/document

const cuid = require('cuid')
const pull = require('pull-stream')

exports = module.exports = {
  first: () => [
    new Map([[null, null]]), // VA
    new Set(), // VR
    new Map()], // E

  reduce: (message, previous) => {
    const state = [
      new Map([...previous[0]]),
      new Set([...previous[1]]),
      new Map([...previous[2]])
    ]

    const add = message[0]
    const addedVertices = state[0]
    if (add) {
      const beforeVertex = add[0]
      if (addedVertices.has(beforeVertex)) {
        const value = add[1]
        const id = add[2]
        const edges = state[2]

        let l = beforeVertex
        let r = edges.get(beforeVertex)
        while (r < id) {
          l = r
          r = edges.get(r)
        }
        addedVertices.set(id, value)
        edges.set(l, id)
        edges.set(id, r)
      }
    }

    const remove = message[1]
    if (remove) {
      const removedVertices = state[1]
      removedVertices.add(remove)
    }

    return state
  },

  valueOf: (state) => {
    const [addedVertices, removedVertices, edges] = state
    const result = []
    let id = edges.get(null)
    while (id) {
      if (!removedVertices.has(id)) {
        result.push(addedVertices.get(id))
      }
      id = edges.get(id)
    }

    return result
  },

  mutators: {
    addRight: (beforeVertex, value, state) => {
      const added = state[0]
      const removed = state[1]

      if (added.has(beforeVertex) && !removed.has(beforeVertex)) {
        return [[beforeVertex, value, cuid()]]
      }
    },
    push (value, state) {
      const edges = state[2]
      let id = null
      while (edges.has(id)) {
        id = edges.get(id)
      }
      return exports.mutators.addRight(id || null, value, state)
    },
    remove: (vertex, state) => {
      const [added, removed] = state
      if (added.has(vertex) && !removed.has(vertex)) {
        return [null, vertex]
      }
    },
    removeAt: (pos, state) => {
      const edges = state[2]
      let i = -1
      let id = null
      while (i < pos) {
        if (edges.has(id)) {
          id = edges.get(id)
        } else {
          throw new Error('nothing at pos ' + pos)
        }
        i++
      }

      return exports.mutators.remove(id, state)
    },
    set: (pos, value, state) => {
      const messages = []
      const edges = state[2]
      let i = -1
      let id = null
      while (i < pos) {
        if (edges.has(id)) {
          id = edges.get(id)
        } else {
          const message = exports.mutators.push(null, state)
          id = message[2]
          messages.push(message)
        }
        i++
      }
      messages.push(exports.mutators.push(value, state))
      return pull.values(messages)
    }
  }
}

'use strict'

// Treedoc

const cuid = require('cuid')
const pull = require('pull-stream')

exports = module.exports = {
  first: () => [[], null, null],
  reduce: (message, tree) => {
    let [nodes, left, right] = tree
    const insert = message[0]
    if (insert) {
      let parent = tree
      const [posId] = insert
      const [path] = posId
      let [length, bits] = path
      while (length) {
        const bit = bits & 1
        bits = bits >> 1
        length--
        if (!bit) {
          // left
          if (!left) {
            parent[1] = left = exports.first()
          }
          parent = left
        } else {
          // right
          if (!right) {
            parent[2] = right = exports.first()
          }
          parent = right
        }

        [nodes, left, right] = parent
      }

      nodes.push(insert)
      parent[0] = nodes.sort(sortSiblings)
    }

    const remove = message[1]
    if (remove) {
      let [nodes, left, right] = tree

      let parent = tree
      const posId = remove
      const [path] = posId
      let [length, bits] = path
      while (length) {
        const bit = bits & 1
        bits = bits >> 1
        length--
        if (!bit) {
          // left
          if (!left) {
            return // early
          }
          parent = left
        } else {
          // right
          if (!right) {
            return // early
          }
          parent = right
        }

        [nodes, left, right] = parent
      }

      const [removePath, removeDisambiguator] = remove
      nodes = nodes.filter((node) => {
        const [posId] = node
        const [path, disambiguator] = posId
        const remain = (
          removePath[0] !== path[0] ||
          removePath[1] !== path[1] ||
          removeDisambiguator !== disambiguator)
        return remain
      })

      parent[0] = nodes
    }

    return tree
  },

  valueOf: (tree) => {
    const array = []
    return walkDepthFirst(tree, (node) => {
      if (node) {
        array.push(node[1])
      } else {
        return array
      }
    })
  },

  mutators: {
    insert: (posId, newAtom) => [[posId, newAtom]],
    delete: (posId) => [null, posId],
    insertBetween (pPosId, fPosId, newAtom) {
      const posId = newPosId(pPosId, fPosId)
      return exports.mutators.insert(posId, newAtom)
    },
    push (atom) {
      const tree = this
      const visitor = (nodes, left, right) => {
        if (right) {
          return visitTree(right, visitor)
        } else if (!nodes.length && left) {
          return visitTree(left, visitor)
        } else {
          const lastNode = nodes[nodes.length - 1]
          const lastId = (lastNode && lastNode[0]) || [[0, 0]]
          const posId = newPosId(lastId)
          return exports.mutators.insert(posId, atom)
        }
      }

      return visitTree(tree, visitor)
    },
    insertAt (pos, atom) {
      const tree = this
      let count = 0
      let l
      let r
      return walkDepthFirst(tree, (node) => {
        count++
        if (count === pos) {
          l = node && node[0]
          if (!node) {
            // we reached the end
            const posId = newPosId(l)
            return exports.mutators.insert(posId, atom)
          }
        } else if (count === (pos + 1)) {
          r = node && node[0]
          const posId = newPosId(l, r)
          return exports.mutators.insert(posId, atom)
        } else {
          l = node[0]
        }
      })
    },
    removeAt (pos) {
      const tree = this
      let count = -1
      return walkDepthFirst(tree, (node) => {
        count++
        if (count === pos) {
          if (node) {
            return exports.mutators.delete(node[0])
          } else {
            return [] // no op
          }
        }
      })
    },
    set (pos, atom) {
      const tree = this
      let count = -1
      let l
      let r
      return walkDepthFirst(tree, (node) => {
        count++
        if (count === pos) {
          if (!node) {
            return fillInBlankMessages(l, pos - count, atom)
          } else {
            l = node[0]
          }
        } else if (count === pos + 1) {
          r = node && node[0]
          return [
            exports.mutators.insertBetween(l, r, atom)[0],
            exports.mutators.delete(l)[1]
          ]
        } else if (!node) {
          return fillInBlankMessages(l, pos - count, atom)
        } else {
          l = node[0]
        }
      })
    }
  }
}

function fillInBlankMessages (lastId, count, last) {
  const messages = []
  for (let i = 0; i < count; i++) {
    lastId = newPosId(lastId || [0, 0])
    messages.push(exports.mutators.insert(lastId, null))
  }
  messages.push(exports.mutators.insert(lastId, last))
  return pull.values(messages)
}

// Sort nodes

function sortSiblings (a, b) {
  const [posIdA] = a
  const [posIdB] = b
  const disambiguatorA = posIdA[1]
  const disambiguatorB = posIdB[1]
  return disambiguatorA < disambiguatorB ? -1 : 1
}

// Walk the tree

function walkDepthFirst (tree, visitor) {
  const val = walkDepthFirstRecursive(tree, visitor)
  if (val) {
    return val
  } else {
    return visitor(null)
  }
}

function walkDepthFirstRecursive (tree, visitor) {
  const [nodes, left, right] = tree
  if (left) {
    const val = walkDepthFirstRecursive(left, visitor)
    if (val !== undefined) {
      // break recursion
      return val
    }
  }
  if (nodes.length) {
    for (let i = 0; i < nodes.length; i++) {
      const val = visitor(nodes[i])
      if (val !== undefined) {
        // break recursion
        return val
      }
    }
  }
  if (right) {
    const val = walkDepthFirstRecursive(right, visitor)
    if (val !== undefined) {
      // break recursion
      return val
    }
  }
}

function visitTree (tree, visitor) {
  const [nodes, left, right] = tree
  return visitor(nodes, left, right)
}

// PosIds and Paths

function newPosId (p, f) {
  const pPath = p && p[0]
  const fPath = f && f[0]
  let path
  let uid
  if (pPath && fPath && isSibling(pPath, fPath)) {
    path = [pPath[0], pPath[1]]
    if (f[1].length > p[1].length) {
      const difference = f[1].substring(p[1].length)
      uid = p[1] + halfOf(difference) + cuid()
    } else {
      uid = p[1] + cuid()
    }
  } else {
    path = newPath(pPath, fPath)
    uid = cuid()
  }

  return [path, uid]
}

function halfOf (s) {
  let result = []
  for (let i = 0; i < s.length; i += 4) {
    const sub = s.substring(i, 4)
    const acc = Buffer.from(sub).map((byte) => byte >> 1)
    result.push(Buffer.from(acc).toString())
  }
  return result.join('')
}

function newPath (p, f) {
  let nPath
  if (f && isSibling(p, f)) {
    nPath = [p[0], p[1]]
  } else if (f && isAncestor(p, f)) {
    nPath = concatPath(f, 0)
  } else {
    nPath = concatPath(p, 1)
  }
  return nPath
}

function concatPath (path, bit) {
  const [length, bits] = path
  return [length + 1, (bits << 1) | bit]
}

function isAncestor (a, b) {
  const lengthA = a[0]
  const lengthB = b[0]

  if (lengthA > lengthB) {
    return false
  }
  const subPathB = take(lengthA, b[1])
  return a[1] === subPathB
}

function isSibling (a, b) {
  return a[0] === b[0] && a[1] === b[1]
}

// Bit manipulation

function take (count, path) {
  return path & maskFor(count)
}

function maskFor (count) {
  let mask = 0
  for (let i = 0; i < count; i++) {
    mask = mask << 1 | 1
  }

  return mask
}
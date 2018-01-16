'use strict'

// Treedoc

const cuid = require('cuid')
const pull = require('pull-stream')

const defaultOptions = {
  count: () => 1
}

module.exports = (opts) => {
  const options = Object.assign({}, defaultOptions, opts)
  const Treedoc = {
    first: () => [[], null, null],
    reduce: (message, tree, changed) => {
      const insert = message[0]
      if (insert) {
        const [[posId]] = insert
        tree = findForImmutableChange(tree, posId, (nodes) => {
          const clonedNodes = nodes.slice(0)
          clonedNodes.push(insert)
          clonedNodes.sort(sortSiblings)
          return clonedNodes
        })
        changed({
          type: 'insert',
          id: insert[0],
          atom: insert[1],
          pos: posFor(tree, insert[0], options.count)
        })
      }

      const remove = message[1]
      if (remove) {
        const [removePath, removeDisambiguator] = remove
        tree = findForImmutableChange(tree, removePath, (nodes) => {
          return nodes.filter((node) => {
            const [posId] = node
            const [path, disambiguator] = posId
            const remain = (
              removePath[0] !== path[0] ||
              removePath[1] !== path[1] ||
              removeDisambiguator !== disambiguator)
            if (!remain) {
              changed({
                type: 'delete',
                id: remove[0],
                pos: posFor(tree, remove, options.count),
                deleted: node[1]
              })
            }
            return remain
          })
        })
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
        return Treedoc.mutators.insert(posId, newAtom)
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
            return Treedoc.mutators.insert(posId, atom)
          }
        }

        return visitTree(tree, visitor)
      },
      insertAt (pos, atom) {
        const tree = this
        let l
        let r
        let afterR
        let count = 0

        const insertBetween = (l, r) => {
          return Treedoc.mutators.insertBetween(l, r, atom)
        }

        const insert = () => {
          const actions = []
          const splitting = count > pos
          if (splitting) {
            return split(l, r, afterR, count - pos, insertBetween)
          } else {
            return insertBetween(l, r)
          }
        }

        return walkDepthFirst(tree, (node) => {
          console.log('NODE: %j', node)
          const c = node && options.count(node[1]) || 0
          console.log('c:', c)

          if (count < pos) {
            count += c
          }
          console.log('count:', count)
          if (!l && pos && (count <= pos)) {
            l = node && node[0]
            console.log('L')
          } else {
            if (r) {
              if (afterR) {
                return insert()
              } else {
                afterR = node && node[0]
                console.log('afterR')
              }
            } else {
              r = node && node[0]
              console.log('R')
            }
            if (count === (pos + 1)) {
              // perfect insertion
              return insert()
            }
          }

          if (!node) {
            // reached the end
            return insert()
          }
        })
      },
      removeAt (pos) {
        const tree = this
        let count = -1
        return walkDepthFirst(tree, (node) => {
          count += options.count(node[1])
          if (count === pos) {
            if (node) {
              return Treedoc.mutators.delete(node[0])
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
          count += options.count(node)
          if (count === pos) {
            if (!node) {
              return fillInBlankMessages(l, pos - count, atom)
            } else {
              l = node[0]
            }
          } else if (count > pos) {
            r = node && node[0]
            return [
              Treedoc.mutators.insertBetween(l, r, atom)[0],
              Treedoc.mutators.delete(l)[1]
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

  function findForImmutableChange (tree, path, cb) {
    let [length, bits] = path
    let [nodes, left, right] = tree
    if (length) {
      const bit = bits & 1
      bits = bits >> 1
      length--
      const newPath = [length, bits]
      if (!bit) {
        // left
        if (!left) {
          left = Treedoc.first()
        }
        return [
          nodes,
          findForImmutableChange(left, newPath, cb),
          right]
      } else {
        // right
        if (!right) {
          right = Treedoc.first()
        }
        return [
          nodes,
          left,
          findForImmutableChange(right, newPath, cb)]
      }
    } else {
      tree[0] = cb(nodes)
    }

    return [...tree]
  }

  function fillInBlankMessages (lastId, count, last) {
    const messages = []
    for (let i = 0; i < count; i++) {
      lastId = newPosId(lastId || [0, 0])
      messages.push(Treedoc.mutators.insert(lastId, null))
    }
    messages.push(Treedoc.mutators.insert(lastId, last))
    return pull.values(messages)
  }

  function split (l, r, afterR, pos, next) {
    const actions = []
    // delete bigger value
    actions.push(Treedoc.mutators.delete(r[0]))

    const [lValue, rValue] = options.split(r[1], pos)
    const newLAction = Treedoc.mutators.insertBetween(l, afterR, lValue)
    actions.push(newLAction)
    const [[newL]] = newLAction

    const newRAction = Treedoc.mutators.insertBetween(newL, afterR, rValue)
    const [[newR]] = newRAction
    actions.push(newRAction)

    // add left and right values
    actions.push(next(newL, newR))
    return pull.values(actions)
  }

  return Treedoc
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
  if (val !== undefined) {
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

function posFor (tree, id, count) {
  let pos = -1
  const [path, disambiguator] = id
  return walkDepthFirst(tree, (node) => {
    if (!node) {
      return
    }
    pos += count(node[1])
    const nodeId = node[0]
    const [nodePath, nodeDisambiguator] = nodeId
    if (nodePath[0] === path[0] && nodePath[1] === path[1] && disambiguator === nodeDisambiguator) {
      return pos
    }
  })
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
  if (!p) {
    p = [0, 0]
  }

  if (f && isSibling(p, f)) {
    nPath = [p[0], p[1]]
  } else if (f && isAncestor(p, f)) {
    nPath = concatPath(f, 0)
  } else {
    nPath = concatPath(p || [0, 0], 1)
  }
  return nPath
}

function concatPath (path, bit) {
  const [length, bits] = path
  return [length + 1, bits | bit << length]
}

function isAncestor (a, b) {
  if (!a || !b) {
    return false
  }
  const lengthA = a[0]
  const lengthB = b[0]

  if (lengthA > lengthB) {
    return false
  }
  const subPathB = take(lengthA, b[1])
  return a[1] === subPathB
}

function isSibling (a, b) {
  return a && b && a[0] === b[0] && a[1] === b[1]
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

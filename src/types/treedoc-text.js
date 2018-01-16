'use strict'

const Treedoc = require('./treedoc')

module.exports = () => {
  const treedoc = Treedoc({
    count: countChars,
    split: split
  })

  return Object.assign({}, treedoc, {
    valueOf (state) {
      return treedoc.valueOf(state).join('')
    }
  })
}

function countChars (value) {
  return (value || '').length
}

function split (value, posFromEnd) {
  const pos = value.length - posFromEnd
  return [value.substring(0, pos), value.substring(pos)]
}

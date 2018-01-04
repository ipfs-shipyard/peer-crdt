'use strict'

module.exports = (buffer) => {
  const ret = Buffer.alloc(buffer.length)
  let i1 = buffer.length
  for (let i2 = 0; i2 < buffer.length; i2++) {
    i1--
    ret[i2] = buffer[i1]
  }

  return ret
}

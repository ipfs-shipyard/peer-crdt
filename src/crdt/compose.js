'use strict'

const EventEmitter = require('events')

module.exports = function compose (create, schema, options) {
  return {
    create: createInstance
  }

  function createInstance (id) {
    const instance = new EventEmitter()
    Object.keys(schema).forEach((key) => {
      const path = id + '/' + key
      let value = schema[key]
      if (typeof value === 'object') {
        value = compose(create, value, options).create(path)
      } else {
        value = create(value, path, options)
      }
      value.on('change', () => {
        setImmediate(() => instance.emit('change'))
      })
      instance[key] = value
    })

    instance.value = () => extractValue(schema, instance)

    return instance
  }
}

function extractValue (schema, instance) {
  const ret = {}
  Object.keys(schema).forEach((key) => {
    let value = instance[key]
    if (value._isPeerCRDT) {
      value = value.value()
    } else {
      value = extractValue(schema[key], value)
    }
    ret[key] = value
  })
  return ret
}

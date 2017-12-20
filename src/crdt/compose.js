'use strict'

const EventEmitter = require('events')

module.exports = function compose (create, schema, options) {
  return {
    create: createInstance
  }

  function createInstance (id) {
    const instance = new EventEmitter()
    const networks = []
    Object.keys(schema).forEach((key) => {
      const path = id + '/' + key
      let value = schema[key]
      if (typeof value === 'object') {
        value = compose(create, value, options).create(path)
      } else {
        value = create(value, path, options)
      }
      networks.push(value.network)
      value.on('change', () => setImmediate(() => instance.emit('change')))
      instance[key] = value
    })

    instance.value = () => extractValue(schema, instance)
    instance.network = {
      start: () => Promise.all(networks.map((network) => network.start())),
      stop: () => Promise.all(networks.map((network) => network.stop()))
    }

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

'use strict'

const pLimit = require('p-limit')
const EventEmitter = require('events')

module.exports = createNetworkWrapper

function createNetworkWrapper (id, log, createNetwork, options) {
  if (!options) {
    throw new Error('need options')
  }
  const decrypt = options.decrypt
  if (typeof decrypt !== 'function') {
    throw new Error('need options.decrypt to be a function')
  }

  const limit = pLimit(1)

  const recursiveGetAndAppend = async (id) => {
    const has = await log.has(id)
    let hasData = false
    if (!has) {
      const entry = await network.get(id)
      const parents = entry[2]
      if (parents && parents.length) {
        hasData = (await Promise.all(parents.map((parentId) => recursiveGetAndAppend(parentId)))).find(Boolean)
      }
      const appendId = await log.appendEncrypted(entry[0], entry[1], entry[2])
      if (id !== appendId) {
        throw new Error('append id wasn\'t the same as network id: ' + appendId + ' and ' + id)
      }
      hasData = hasData || entry[0] !== null
    }
    return hasData
  }

  const _onRemoteHead = async (remoteHead) => {
    const start = Date.now()
    const hadNewData = await recursiveGetAndAppend(remoteHead)
    if (hadNewData) {
      await log.merge(remoteHead)
    }
    console.log('_onRemoteHead took', Date.now() - start)
  }

  // processing one message at a time
  const onRemoteHead = (remoteHead) => limit(() => _onRemoteHead(remoteHead))

  const network = createNetwork(id, log, onRemoteHead)

  const networkWrapper = new EventEmitter()
  networkWrapper.setMaxListeners(Infinity)

  return Object.assign(networkWrapper, {
    isStarted: false,
    async start () {
      await network.start()
      this.isStarted = true
      log.on('new head', (head) => network.setHead(head))
      const head = await log.getHead()
      if (head) {
        network.setHead(head)
      }
      this.emit('started')
    },

    stop () {
      return network.stop().then(() => this.emit('stopped'))
    }
  })
}

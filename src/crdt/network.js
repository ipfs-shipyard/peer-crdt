'use strict'

const pLimit = require('p-limit')
const EventEmitter = require('events')

module.exports = createNetworkWrapper

function createNetworkWrapper (id, log, createNetwork, options) {
  if (!options) {
    throw new Error('need options')
  }

  const limit = pLimit(1)

  const remoteHeads = new Set()

  const getAndAppend = async (id) => {
    const searchNodes = [{ id }]
    const seenIds = new Set()
    const appendOrder = []

    // Fetch parent items
    while (searchNodes.length > 0) {
      const current = searchNodes.pop()
      if (!current) {
        continue
      }

      if (remoteHeads.has(current.id) || await log.has(current.id)) {
        remoteHeads.delete(id)
        continue
      }

      if (!current.data) {
        current.data = await network.get(current.id)
      }

      const [value, auth, parentIds] = current.data
      if (value !== null) {
        const authentic = await options.authenticate(value, parentIds, auth)
        if (!authentic) {
          console.error('warning: authentication failure, signature was: ', auth)
          continue
        }
      }

      const unseenIds = parentIds.filter(id => !seenIds.has(id))
      for (const parentId of parentIds) {
        seenIds.add(parentId)
      }
      const parents = await Promise.all(unseenIds.map(async (id) => ({
        id,
        data: await network.get(id)
      })))
      for (const parent of parents) {
        searchNodes.push(parent)
      }

      appendOrder.push(current)
    }

    let containedNewData = false
    while (appendOrder.length > 0) {
      const item = appendOrder.pop()
      const appendId = await log.appendEncrypted(item.data[0], item.data[1], item.data[2])
      if (item.id !== appendId) {
        throw new Error('append id wasn\'t the same as network id: ' + appendId + ' and ' + id)
      }
      containedNewData = containedNewData || item.data[0] !== null
    }

    return containedNewData
  }

  const _onRemoteHead = async (remoteHead) => {
    // console.log('_onRemoteHead')
    // const start = Date.now()
    const containedNewData = await getAndAppend(remoteHead)
    if (containedNewData) {
      await log.merge(remoteHead)
    } else {
      remoteHeads.add(remoteHead)
    }
    // console.log('_onRemoteHead took', Date.now() - start)
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

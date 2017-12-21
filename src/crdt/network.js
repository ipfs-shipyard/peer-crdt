'use strict'

const pLimit = require('p-limit')

module.exports = createNetworkWrapper

function createNetworkWrapper (id, log, createNetwork) {
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
      const appendId = await log.append(entry[0], entry[1], entry[2])
      if (id !== appendId) {
        throw new Error('append id wasn\'t the same as network id')
      }
      hasData = hasData || entry[0] !== null
    }
    return hasData
  }

  const _onRemoteHead = async (remoteHead) => {
    const hadNewData = await recursiveGetAndAppend(remoteHead)
    if (hadNewData) {
      await log.merge(remoteHead)
    }
  }

  // processing one message at a time
  const onRemoteHead = (remoteHead) => limit(() => _onRemoteHead(remoteHead))

  const network = createNetwork(id, log, onRemoteHead)
  return {
    async start () {
      await network.start()
      const head = await log.getHead()
      if (head) {
        network.setHead(head)
      }
      log.on('new head', (head) => network.setHead(head))
    },

    stop () {
      return network.stop()
    }
  }
}

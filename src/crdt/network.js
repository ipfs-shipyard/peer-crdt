'use strict'

module.exports = createNetworkWrapper

function createNetworkWrapper (id, log, createNetwork) {
  const network = createNetwork(id, log)
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

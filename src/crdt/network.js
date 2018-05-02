'use strict'

const pLimit = require('p-limit')
const EventEmitter = require('events')

module.exports = createNetworkWrapper

function createNetworkWrapper (id, log, createNetwork, options) {
  if (!options) {
    throw new Error('need options')
  }

  const limit = pLimit(1)

  const pendingItems = new Set()
  const fetchedItems = new Set()
  // const queue = new PQueue({ concurrency: 1 })

  const fetchEntries = async (ids) => {
    // console.log('Fetching batch:', ids)
    ids = [...new Set(ids)].filter(id => {
      return !pendingItems.has(id) && !fetchedItems.has(id)
    })

    await Promise.all(ids.map(id => fetchEntry(id)))
  }

  const fetchEntry = async (id) => {
    pendingItems.add(id)

    // console.log('Fetching item', id)
    if (fetchedItems.has(id)) {
      pendingItems.delete(id)
      return
    }

    const exists = await log.has(id)
    if (exists) {
      fetchedItems.add(id)
      pendingItems.delete(id)
      return
    }

    const entry = await network.get(id)
    const [value, auth, parents] = entry
    fetchedItems.add(id)
    pendingItems.delete(id)

    if (value !== null) {
      const authentic = await options.authenticate(value, parents, auth)
      if (!authentic) {
        console.error('warning: authentication failure, signature was: ', auth)
      }
    } else {
      return
    }

    await fetchEntries(parents)

    // console.log('awaiting log append', id)
    const appendId = await log.appendEncrypted(value, auth, parents)
    // console.log('finished log appendx', id)
    if (id !== appendId) {
      throw new Error('append id wasn\'t the same as network id: ' + appendId + ' and ' + id)
    }
  }

  const _onRemoteHead = (remoteHead, ancestors = []) => {
    // console.log('New remote head', remoteHead)
    return fetchEntries([remoteHead, ...ancestors]).then(() => {
      // console.log('Merging head', remoteHead)
      return log.merge(remoteHead)
    }).catch(err => {
      console.error(err)
    })
  }

  const onRemoteHead = (remoteHead, ancestors) => limit(() => _onRemoteHead(remoteHead, ancestors))
  /*
    // console.log('Queuing', remoteHead)
    queue.add(() => _onRemoteHead(remoteHead, ancestors)) //.then(() => console.log('Finished', remoteHead))
  }
  */

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

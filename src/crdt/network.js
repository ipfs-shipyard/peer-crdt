'use strict'

const PQueue = require('p-queue')
const EventEmitter = require('events')

module.exports = createNetworkWrapper

function createNetworkWrapper (id, log, createNetwork, options) {
  if (!options) {
    throw new Error('need options')
  }

  const pendingItems = new Set()
  const queue = new PQueue({ concurrency: 1 })

  const fetchEntries = async (ids, fetched = new Set()) => {
    // console.log('Fetching batch:', ids)
    ids = [...new Set(ids)]

    const potentialIds = ids.filter(id => !pendingItems.has(id) && !fetched.has(id))
    const alreadyApplied = await Promise.all(potentialIds.map(id => log.has(id)))
    const neededIds = ids.map((id, i) => {
      if (!alreadyApplied[i]) {
        pendingItems.add(id)
        return id
      }
      return null
    }).filter(v => v !== null)

    return Promise.all(neededIds.map(id => fetchEntry(id, fetched)))
  }

  const fetchEntry = async (id, fetched) => {
    // console.log('Fetching item', id)
    pendingItems.add(id)

    const entry = await network.get(id)
    const [value, auth, parents] = entry
    fetched.add(id)

    if (value !== null) {
      const authentic = await options.authenticate(value, parents, auth)
      if (!authentic) {
        console.error('warning: authentication failure, signature was: ', auth)
      }
    } else {
      pendingItems.delete(id)
      return
    }

    await fetchEntries(parents)

    const appendId = await log.appendEncrypted(value, auth, parents)
    if (id !== appendId) {
      throw new Error('append id wasn\'t the same as network id: ' + appendId + ' and ' + id)
    }

    pendingItems.delete(id)
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

  const onRemoteHead = (remoteHead, ancestors) => {
    queue.add(() => _onRemoteHead(remoteHead, ancestors))
  }

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

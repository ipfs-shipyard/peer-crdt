'use strict'

const virtualNetwork = require('./virtual-network')
const pLimit = require('p-limit')

const DEFAULT_BROADCAST_FREQ = 200

class Network {
  constructor (id, log, broadcastFrequency) {
    this._id = id
    this._log = log
    this._broadcastFrequency = broadcastFrequency || DEFAULT_BROADCAST_FREQ

    this._head = undefined

    this._limit = pLimit(1)

    this.onMessage = this.onMessage.bind(this)
    this.onWant = this.onWant.bind(this)
  }

  async start () {
    virtualNetwork.on(this._id, this.onMessage)
    virtualNetwork.on('want', this.onWant)
    this._broadcastHeadInterval = setInterval(() => this.broadcastHead.bind(this), this._broadcastFrequency)
    this.broadcastHead()
  }

  setHead (head) {
    this._head = head
    this.broadcastHead()
  }

  broadcastHead () {
    if (this._head) {
      this.broadcast(this._head)
    }
  }

  onMessage (message) {
    // processing one message at a time
    return this._limit(() => this._onMessage(message))
  }

  _onMessage (message) {
    return this.onRemoteHead(JSON.parse(message))
  }

  async onRemoteHead (remoteHead) {
    const hadNewData = await this.recursiveGetAndAppend(remoteHead)
    if (hadNewData) {
      await this._log.merge(remoteHead)
    }
  }

  async recursiveGetAndAppend (id) {
    const has = await this._log.has(id)
    let hasData = false
    if (!has) {
      const entry = await virtualNetwork.get(id)
      const parents = entry[2]
      if (parents && parents.length) {
        hasData = (await Promise.all(parents.map((parentId) => this.recursiveGetAndAppend(parentId)))).find(Boolean)
      }
      const appendId = await this._log.append(entry[0], entry[1], entry[2])
      if (id !== appendId) {
        throw new Error('append id wasn\'t the same as network id')
      }
      hasData = hasData || entry[0] !== null
    }
    return hasData
  }

  async onWant (message) {
    const wantId = JSON.parse(message)
    const has = await this._log.has(wantId)
    if (has) {
      const entry = await this._log.get(wantId)
      if (entry) {
        virtualNetwork.broadcast(wantId, JSON.stringify(entry))
      }
    }
  }

  broadcast (message) {
    virtualNetwork.broadcast(this._id, JSON.stringify(message))
  }

  async stop () {
    virtualNetwork.removeListener(this._id, this.onMessage)
    virtualNetwork.on('want', this.onWant)
    clearInterval(this._broadcastHeadInterval)
  }
}

module.exports = Network

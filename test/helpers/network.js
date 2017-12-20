'use strict'

const virtualNetwork = require('./virtual-network')

class Network {
  constructor (id, log) {
    this._id = id
    this._log = log

    this.onNewHead = this.onNewHead.bind(this)
    this.onMessage = this.onMessage.bind(this)
    this.onWant = this.onWant.bind(this)
  }

  async start () {
    this._log.on('new head', this.onNewHead)
    virtualNetwork.on(this._id, this.onMessage)
    virtualNetwork.on('want', this.onWant)
  }

  onNewHead (head) {
    this.broadcast(head)
  }

  onMessage (message) {
    return this.onRemoteHead(JSON.parse(message))
  }

  async onRemoteHead (remoteHead) {
    const has = await this._log.has(remoteHead)
    if (!has) {
      const entry = await virtualNetwork.get(remoteHead)
      const parents = entry[2]
      if (parents && parents.length) {
        await Promise.all(parents.map((parentId) => this.onRemoteHead(parentId)))
      }
      await this._log.append(entry[0], entry[1], entry[2])
    }
  }

  async onWant (message) {
    const wantId = JSON.parse(message)
    const has = await this._log.has(wantId)
    if (has) {
      const entry = this._log.get(wantId)
      if (entry) {
        virtualNetwork.broadcast(wantId, JSON.stringify(entry))
      }
    }
  }

  broadcast (message) {
    virtualNetwork.broadcast(this._id, JSON.stringify(message))
  }

  async stop () {
    this._log.removeListener('new head', this.onNewHead)
    virtualNetwork.removeListener(this._id, this.onMessage)
    virtualNetwork.on('want', this.onWant)
  }
}

module.exports = Network

/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const Store = require('./helpers/store')
const Network = require('./helpers/network')
const CRDT = require('../')
const encrypt = require('./helpers/encrypt2')
const decrypt = require('./helpers/decrypt2')

describe('repicate', () => {
  let crdt
  let node
  let replicatingNode

  before(() => {
    crdt = CRDT.defaults({
      store: (id) => new Store(id),
      network: (id, log, onRemoteHead) => new Network(id, log, onRemoteHead, 100),
      authenticate: (entry, parents) => 'authentication for ' + entry
    })
  })

  before(() => {
    node = crdt.create('g-counter', 'read-only-id', {
      signAndEncrypt: encrypt,
      decryptAndVerify: decrypt
    })

    replicatingNode = crdt.replicate('read-only-id')
  })

  before(() => {
    return Promise.all([
      node.network.start(),
      replicatingNode.network.start()
    ])
  })

  before(() => {
    node.increment()
    node.increment()
  })

  before((done) => setTimeout(done, 1900))

  before(() => {
    expect(node.value()).to.equal(2)
  })

  before(() => node.network.stop())

  before((done) => setTimeout(done, 1900))

  before(() => {
    node = crdt.create('g-counter', 'read-only-id', {
      signAndEncrypt: encrypt,
      decryptAndVerify: decrypt
    })
  })

  before(() => node.network.start())

  before((done) => setTimeout(done, 1900))

  after(() => replicatingNode.network.stop())

  after(() => node.network.stop())

  it('replicated', () => expect(node.value()).to.equal(2))

  it('change value', () => node.increment())

  it('wait a bit', (done) => setTimeout(done, 1900))

  it('stops write node', () => node.network.stop())

  it('creates a new read-only node', () => {
    node = crdt.create('g-counter', 'read-only-id', {
      decryptAndVerify: decrypt
    })
  })

  it('starts that node', () => node.network.start())

  it('waits a bit', (done) => setTimeout(done, 1900))

  it('replicated', () => {
    expect(node.value()).to.equal(3)
  })
})

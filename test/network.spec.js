/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const Store = require('./helpers/store')
const Network = require('./helpers/network')
const CRDT = require('../')
const gCounter = require('./helpers/g-counter-type')
const encrypt = require('./helpers/encrypt')
const decrypt = require('./helpers/decrypt')

describe('networking', () => {
  let myCRDT
  let crdt
  let instances

  before(() => CRDT.define('g-counter-network', gCounter))

  before(() => {
    myCRDT = CRDT.defaults({
      store: (id) => new Store(id),
      network: (id, log, onRemoteHead) => new Network(id, log, onRemoteHead, 100),
      sign: (entry, parents) => 'authentication for ' + entry,
      authenticate: (entry, parents, signature) => 'authentication for ' + entry === signature,
      signAndEncrypt: encrypt,
      decryptAndVerify: decrypt
    })
  })

  before(() => {
    crdt = myCRDT.compose({
      a: 'g-counter-network',
      b: 'g-counter-network',
      c: {
        d: 'g-counter-network'
      }
    })
  })

  it('can create two connected crdts', () => {
    instances = [
      crdt.create('networked-id'),
      crdt.create('networked-id'),
      crdt.create('networked-different-id')
    ]
  })

  it('can start both instances', () => {
    return Promise.all(instances.map((instance) => instance.network.start()))
  })

  it('can change one in root, and is reflected on the other', (done) => {
    instances[1].once('deep change', () => {
      expect(instances[1].value()).to.deep.equal({
        a: 1,
        b: 0,
        c: {
          d: 0
        }
      })
      done()
    })

    // nothing should happen in third instance because of different id
    instances[2].once('deep change', () => { throw new Error('should not change') })

    instances[0].a.increment()
  })

  it('can change one in depth, and is reflected on the other', (done) => {
    instances[0].once('deep change', () => {
      expect(instances[0].value()).to.deep.equal({
        a: 1,
        b: 0,
        c: {
          d: 1
        }
      })
      done()
    })
    instances[2].once('deep change', () => { throw new Error('should not change') })
    instances[1].c.d.increment()
  })

  it('can stop both instances', () => {
    return Promise.all(instances.map((instance) => instance.network.stop()))
  })
})

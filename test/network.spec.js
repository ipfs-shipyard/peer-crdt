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

describe('networking', () => {
  let myCRDT
  let crdt
  let instances

  before(() => CRDT.define('g-counter-network', gCounter))

  before(() => {
    myCRDT = CRDT.defaults({
      store: (id) => new Store(id),
      network: (id, log) => new Network(id, log),
      authenticate: (entry, parents) => 'authentication for ' + entry
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
      crdt.create('networked-id')
    ]
  })

  it('can start both instances', () => {
    return Promise.all(instances.map((instance) => instance.network.start()))
  })

  it('can change one in root, and is reflected on the other', (done) => {
    instances[1].once('change', () => {
      expect(instances[1].value()).to.deep.equal({
        a: 1,
        b: 0,
        c: {
          d: 0
        }
      })
      done()
    })
    instances[0].a.increment()
  })

  it('can change one in depth, and is reflected on the other', (done) => {
    instances[0].once('change', () => {
      expect(instances[0].value()).to.deep.equal({
        a: 1,
        b: 0,
        c: {
          d: 1
        }
      })
      done()
    })
    instances[1].c.d.increment()
  })

  it('can stop both instances', () => {
    return Promise.all(instances.map((instance) => instance.network.stop()))
  })
})

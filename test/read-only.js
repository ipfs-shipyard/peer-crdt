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
const encrypt = require('./helpers/encrypt2')
const decrypt = require('./helpers/decrypt2')

describe('read-only', () => {
  let myCRDT
  let crdt
  let instances

  before(() => CRDT.define('g-counter-read-only', gCounter))

  before(() => {
    myCRDT = CRDT.defaults({
      store: (id) => new Store(id),
      network: (id, log, onRemoteHead) => new Network(id, log, onRemoteHead, 100),
      authenticate: (entry, parents) => 'authentication for ' + entry
    })
  })

  before(() => {
    crdt = myCRDT.compose({
      a: 'g-counter-read-only',
      b: 'g-counter-read-only',
      c: {
        d: 'g-counter-read-only'
      }
    })
  })

  it('can create two connected crdts', () => {
    instances = [
      crdt.create('read-only-id', {
        encrypt,
        decrypt
      }),
      crdt.create('read-only-id', {
        decrypt
      })
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

    instances[0].a.increment()
  })

  it('can change one in depth, and is reflected on the other', (done) => {
    instances[1].once('deep change', () => {
      expect(instances[0].value()).to.deep.equal({
        a: 1,
        b: 0,
        c: {
          d: 1
        }
      })
      done()
    })
    instances[0].c.d.increment()
  })

  it('breaks if read-only mode tries to write', (done) => {
    process.once('unhandledRejection', (rej) => {
      expect(rej.message).to.equal('this._options.encrypt is not a function')
      done()
    })

    instances[1].c.d.increment()
  })

  it('can stop both instances', () => {
    return Promise.all(instances.map((instance) => instance.network.stop()))
  })
})

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

describe('CRDT', () => {
  let myCRDT
  let crdt

  it('can define a CRDT type', () => {
    CRDT.define('g-counter-crdt-test', gCounter)
  })

  it('can create a constructor with default options', () => {
    myCRDT = CRDT.defaults({
      store: (id) => new Store(id),
      network: (id) => new Network(id),
      sign: (entry, parents) => 'authentication for ' + entry,
      signAndEncrypt: encrypt,
      decryptAndVerify: decrypt
    })
  })

  it('unknown type throws', () => {
    expect(() => myCRDT.create('unknown')).to.throw('unknown type unknown')
  })

  it('need id', () => {
    expect(() => myCRDT.create('g-counter-crdt-test')).to.throw('need id')
  })

  it('can create crdt', () => {
    crdt = myCRDT.create('g-counter-crdt-test', 'test')
  })

  it('value starts at 0', () => {
    expect(crdt.value()).to.equal(0)
  })

  it('increments', (done) => {
    crdt.once('change', () => {
      expect(crdt.value()).to.equal(1)
      done()
    })
    crdt.increment()
  })
})

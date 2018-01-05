/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const Store = require('./helpers/store')
const Network = require('./helpers/network')
const CRDT = require('../')
const encrypt = require('./helpers/encrypt')
const decrypt = require('./helpers/decrypt')

describe('dynamic composition', () => {
  let myCRDT
  let embeddable
  let arrays

  before(() => {
    myCRDT = CRDT.defaults({
      store: (id) => new Store(id),
      network: (id, log, onRemoteHead) => new Network(id, log, onRemoteHead, 100),
      signAndEncrypt: encrypt,
      decryptAndVerify: decrypt
    })
  })

  before(() => {
    arrays = [
      myCRDT.create('rga', 'embedding-test', {
        authenticate: (entry, parents) => 'authentication for 0 ' + JSON.stringify([entry, parents])
      }),
      myCRDT.create('rga', 'embedding-test', {
        authenticate: (entry, parents) => 'authentication for 1 ' + JSON.stringify([entry, parents])
      })
    ]
  })

  before(() => {
    return Promise.all(arrays.map((a) => a.network.start()))
  })

  after(() => {
    return Promise.all(arrays.map((a) => a.network.stop()))
  })

  it('can embed', () => {
    embeddable = arrays[0].createForEmbed('g-counter')
    arrays[0].push(embeddable)
  })

  it('has value', (done) => {
    let pending = 2
    arrays[0].once('change', () => {
      expect(arrays[0].value()).to.deep.equal([0])
      if (!(--pending)) done()
    })

    arrays[1].once('change', () => {
      expect(arrays[1].value()).to.deep.equal([0])
      if (!(--pending)) done()
    })
  })

  it('can be further embedded', (done) => {
    arrays[0].once('change', () => {
      expect(arrays[0].value()).to.deep.equal([0, 0])
      done()
    })
    arrays[1].push(embeddable)
  })

  it('cascades changes', (done) => {
    arrays[0].once('deep change', () => {
      expect(arrays[0].value()).to.deep.equal([1, 1])
      done()
    })
    embeddable.increment()
  })

  it('mirrors embeds', (done) => {
    const embeddable = arrays[0].createForEmbed('g-counter')
    arrays[0].once('change', (event) => {
      const otherEmbeddable = event.value
      otherEmbeddable.once('change', () => {
        expect(otherEmbeddable.value()).to.equal(1)
        otherEmbeddable.once('change', () => {
          expect(otherEmbeddable.value()).to.equal(2)
          done()
        })
      })
    })
    arrays[0].push(embeddable)
    embeddable.increment()
    embeddable.increment()
  })
})

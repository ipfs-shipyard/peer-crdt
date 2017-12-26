/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const Store = require('./helpers/store')
const Network = require('./helpers/network')
const CRDT = require('../')

describe('dynamic composition', () => {
  let myCRDT
  let arrays

  before(() => {
    myCRDT = CRDT.defaults({
      store: (id) => new Store(id),
      network: (id, log, onRemoteHead) => new Network(id, log, onRemoteHead, 100)
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
    arrays[0].push(myCRDT.embed('g-counter'))
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
})

process.on('unhandledRejection', (rej) => {
  console.log(rej)
})

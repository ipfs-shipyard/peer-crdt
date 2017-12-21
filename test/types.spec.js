'use strict'

/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const Store = require('./helpers/store')
const Network = require('./helpers/network')
const CRDT = require('../')

describe('types', () => {
  let myCRDT

  before(() => {
    myCRDT = CRDT.defaults({
      store: (id) => new Store(id),
      network: (id, log) => new Network(id, log, 100)
    })
  })

  describe('g-counter', () => {
    let instances

    before(() => {
      instances = [
        myCRDT.create('g-counter', 'g-counter-test', {
          authenticate: (entry, parents) => 'authentication for 0 ' + JSON.stringify([entry, parents])
        }),
        myCRDT.create('g-counter', 'g-counter-test', {
          authenticate: (entry, parents) => 'authentication for 1 ' + JSON.stringify([entry, parents])
        })
      ]
    })

    before(() => {
      return Promise.all(instances.map((i) => i.network.start()))
    })

    after(() => {
      return Promise.all(instances.map((i) => i.network.stop()))
    })

    it('converges', function (done) {
      this.timeout(3000)
      instances[0].increment()
      instances[0].increment()
      instances[1].increment()
      instances[0].increment()
      instances[1].increment()
      instances[1].increment()
      instances[1].increment()

      setTimeout(() => {
        expect(instances.map((i) => i.value())).to.deep.equal([7, 7])
        done()
      }, 2000)
    })
  })

  describe('pn-counter', () => {
    let instances

    before(() => {
      instances = [
        myCRDT.create('pn-counter', 'pn-counter-test', {
          authenticate: (entry, parents) => 'authentication for 0 ' + JSON.stringify([entry, parents])
        }),
        myCRDT.create('pn-counter', 'pn-counter-test', {
          authenticate: (entry, parents) => 'authentication for 1 ' + JSON.stringify([entry, parents])
        })
      ]
    })

    before(() => {
      return Promise.all(instances.map((i) => i.network.start()))
    })

    after(() => {
      return Promise.all(instances.map((i) => i.network.stop()))
    })

    it('converges', function (done) {
      this.timeout(3000)
      instances[0].increment()
      instances[0].increment()
      instances[1].increment()
      instances[0].decrement()
      instances[1].increment()
      instances[1].decrement()
      instances[1].increment()

      setTimeout(() => {
        expect(instances.map((i) => i.value())).to.deep.equal([3, 3])
        done()
      }, 2000)
    })
  })
})

process.on('unhandledRejection', (rej) => {
  console.log(rej)
})

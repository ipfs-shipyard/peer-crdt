/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const Store = require('./helpers/store')
const CRDT = require('../')
const gCounter = require('./helpers/g-counter-type')

describe('CRDT', () => {
  let konstructor
  let crdt

  it('can define a CRDT type', () => {
    CRDT.define('g-counter', gCounter)
  })

  it('can create a constructor with default options', () => {
    konstructor = CRDT.defaults({
      store: new Store('test'),
      authenticate: (entry, parents) => {}
    })
  })

  it('unknown type throws', () => {
    expect(() => konstructor('unknown')).to.throw('unknown type unknown')
  })

  it('need id', () => {
    expect(() => konstructor('g-counter')).to.throw('need id')
  })

  it('can create crdt', () => {
    crdt = konstructor('g-counter', 'test')
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

process.on('unhandledRejection', (rej) => console.log(rej))

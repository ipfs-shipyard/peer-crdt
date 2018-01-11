/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const treedoc = require('../../src/types/treedoc')
const ValueAfter = require('./helpers/text-array-value-after')

describe('treedoc', () => {
  it('gets the expected result after applying all the messages', () => {
    const valueAfter = ValueAfter(treedoc)
    expect(valueAfter('hello world')).to.equal('hello world')
    expect(valueAfter('he<el<<ello  <world<d')).to.equal('hello world')
    expect(valueAfter([['he', 'llo'], [' wor', 'ld']])).to.equal('hello world')
    expect(valueAfter(new Set(['hello', ' world']))).to.equal('h ewlolrold')
  })
})

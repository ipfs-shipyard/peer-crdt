/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const Log = require('../src/log')

describe('log', () => {
  it('cannot create log without an id', () => {
    expect(() => Log()).to.throw('need log id')
  })
})

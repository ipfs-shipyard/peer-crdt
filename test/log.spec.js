/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const Log = require('../src/log')

describe('log', () => {
  describe('creation', () => {
    it('cannot create log without an id', () => {
      expect(() => Log()).to.throw('need log id')
    })

    it('cannot create log without a string id', () => {
      expect(() => Log(1)).to.throw('need log id to be a string')
    })

    it('can be created with a string id', () => {
      Log('some string')
    })
  })
})

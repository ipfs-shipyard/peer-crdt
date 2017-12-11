/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const pull = require('pull-stream')

const Log = require('../src/log')

describe('log', () => {
  describe('constructor', () => {
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

  describe('instance', () => {
    let log

    before(() => {
      log = Log('a')
    })

    it('appends', () => {
      return log.append(1).then((id) => {
        expect(id).to.be.string('1')
      })
    })

    it('appends again', () => {
      return log.append(2).then((id) => {
        expect(id).to.be.string('2')
      })
    })

    it('can stream all entries', (done) => {
      pull(
        log.since(),
        pull.collect((err, entries) => {
          expect(err).to.not.exist()
          expect(entries).to.deep.equal([1, 2])
          done()
        })
      )
    })

    it('can stream entries since', (done) => {
      pull(
        log.since('1'),
        pull.collect((err, entries) => {
          expect(err).to.not.exist()
          expect(entries).to.deep.equal([1, 2])
          done()
        })
      )
    })
  })
})

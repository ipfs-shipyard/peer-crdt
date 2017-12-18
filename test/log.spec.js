/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const pull = require('pull-stream')

const Log = require('../src/log')
const Store = require('./helpers/store')

describe('log', () => {
  describe('constructor', () => {
    it('cannot create log without an id', () => {
      expect(() => Log()).to.throw('need log id')
    })

    it('cannot create log without a string id', () => {
      expect(() => Log(1)).to.throw('need log id to be a string')
    })

    it('can be created with a string id', () => {
      Log('some string', new Store())
    })
  })

  describe('instance', () => {
    let log
    let entryId

    before(() => {
      log = Log('a', new Store())
    })

    it('appends', () => {
      return log.append(1).then((id) => {
        expect(id).to.exist()
      })
    })

    it('appends again', () => {
      return log.append(2).then((id) => {
        entryId = id
        expect(id).to.exist()
      })
    })

    describe('streams entries', () => {
      before(() => {
        return Promise.all([
          log.append(3),
          log.append(4)
        ])
      })

      it('empty if empty log', (done) => {
        const log = Log('b', new Store())
        pull(
          log.since(),
          pull.collect((err, entries) => {
            expect(err).to.not.exist()
            expect(entries).to.deep.equal([])
            done()
          })
        )
      })

      it('can stream all entries', (done) => {
        pull(
          log.all(),
          pull.collect((err, entries) => {
            expect(err).to.not.exist()
            expect(entries).to.deep.equal([1, 2, 3, 4])
            done()
          })
        )
      })

      it('can stream all entries (since)', (done) => {
        pull(
          log.since(),
          pull.collect((err, entries) => {
            expect(err).to.not.exist()
            expect(entries).to.deep.equal([1, 2, 3, 4])
            done()
          })
        )
      })

      it('entries since unknown is a complete stream', (done) => {
        pull(
          log.since('does not exist'),
          pull.collect((err, entries) => {
            expect(err).to.not.exist()
            expect(entries).to.deep.equal([1, 2, 3, 4])
            done()
          })
        )
      })

      it('can stream entries since', (done) => {
        expect(entryId).to.exist()
        pull(
          log.since(entryId),
          pull.collect((err, entries) => {
            expect(err).to.not.exist()
            expect(entries).to.deep.equal([3, 4])
            done()
          })
        )
      })
    })

    describe('emits new head on append', () => {
      it('emits', (done) => {
        log.once('new head', (id) => {
          expect(typeof id).to.equal('string')
          done()
        })

        log.append(5)
      })
    })

    describe('merge', () => {
      it('merges', (done) => {
        log.on('new head', (id) => {
          pull(
            log.all(),
            pull.collect((err, results) => {
              expect(err).to.not.exist()
              expect(results).to.deep.equal([1, 2, '2.1', 3, 4, 5])
              done()
            })
          )
        })

        log.append('2.1', entryId)
      })
    })
  })
})

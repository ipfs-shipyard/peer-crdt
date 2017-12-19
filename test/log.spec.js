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
  const entryIds = []

  describe('constructor', () => {
    it('cannot create log without an id', () => {
      expect(() => Log()).to.throw('need log id')
    })

    it('cannot create log without a string id', () => {
      expect(() => Log(1)).to.throw('need log id to be a string')
    })

    it('cannot create without authenticate function', () => {
      expect(() => Log('some string', new Store())).to.throw('need authentication function')
    })

    it('can be created', () => {
      Log('some string', new Store(), () => {})
    })
  })

  describe('instance', () => {
    let log
    let entryId

    before(() => {
      log = Log('a', new Store(), async (value, parents) => 'auth for ' + value)
    })

    it('appends', () => {
      return log.append(1, 'auth for 1').then((id) => {
        expect(id).to.exist()
        entryIds.push(id)
      })
    })

    it('appends again', () => {
      return log.append(2, 'auth for 2').then((id) => {
        entryId = id
        entryIds.push(id)
        expect(id).to.exist()
      })
    })

    describe('streams entries', () => {
      before(() => {
        return Promise.all([
          log.append(3, 'auth for 3'),
          log.append(4, 'auth for 4')
        ]).then((ids) => entryIds.concat(ids))
      })

      it('empty if empty log', (done) => {
        const log = Log('b', new Store(), async (entry) => 'auth for ' + entry)
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
            expect(entries).to.deep.equal([
              { id: '0414bc2923fac741e4ccc8b71ffe3ea8106fffd15f0adcfd70aa3083b0e2c972',
                value: 1,
                auth: 'auth for 1',
                parents: [] },
              { id: 'b553fc82acf93a408b2272c728a943ed8641f1bcad88e61e26b775e0431c67be',
                value: 2,
                auth: 'auth for 2',
                parents:
                 [ '0414bc2923fac741e4ccc8b71ffe3ea8106fffd15f0adcfd70aa3083b0e2c972' ] },
              { id: 'e3247eb823be0be2325f1a25251310179795387e41f3e0c0075061adbb2ba7c9',
                value: 3,
                auth: 'auth for 3',
                parents:
                 [ 'b553fc82acf93a408b2272c728a943ed8641f1bcad88e61e26b775e0431c67be' ] },
              { id: '0c392a1b92842de5c06cdae0b70159dcb0e6b1ae3f776e4af2d75d94b8830482',
                value: 4,
                auth: 'auth for 4',
                parents:
                 [ 'e3247eb823be0be2325f1a25251310179795387e41f3e0c0075061adbb2ba7c9' ] } ])
            done()
          })
        )
      })

      it('can stream all entries (since)', (done) => {
        pull(
          log.since(),
          pull.collect((err, entries) => {
            expect(err).to.not.exist()
            expect(entries).to.deep.equal([
              { id: '0414bc2923fac741e4ccc8b71ffe3ea8106fffd15f0adcfd70aa3083b0e2c972',
                value: 1,
                auth: 'auth for 1',
                parents: [] },
              { id: 'b553fc82acf93a408b2272c728a943ed8641f1bcad88e61e26b775e0431c67be',
                value: 2,
                auth: 'auth for 2',
                parents:
                 [ '0414bc2923fac741e4ccc8b71ffe3ea8106fffd15f0adcfd70aa3083b0e2c972' ] },
              { id: 'e3247eb823be0be2325f1a25251310179795387e41f3e0c0075061adbb2ba7c9',
                value: 3,
                auth: 'auth for 3',
                parents:
                 [ 'b553fc82acf93a408b2272c728a943ed8641f1bcad88e61e26b775e0431c67be' ] },
              { id: '0c392a1b92842de5c06cdae0b70159dcb0e6b1ae3f776e4af2d75d94b8830482',
                value: 4,
                auth: 'auth for 4',
                parents:
                 [ 'e3247eb823be0be2325f1a25251310179795387e41f3e0c0075061adbb2ba7c9' ] } ])
            done()
          })
        )
      })

      it('entries since unknown is a complete stream', (done) => {
        pull(
          log.since('does not exist'),
          pull.collect((err, entries) => {
            expect(err).to.not.exist()
            expect(entries).to.deep.equal([
              { id: '0414bc2923fac741e4ccc8b71ffe3ea8106fffd15f0adcfd70aa3083b0e2c972',
                value: 1,
                auth: 'auth for 1',
                parents: [] },
              { id: 'b553fc82acf93a408b2272c728a943ed8641f1bcad88e61e26b775e0431c67be',
                value: 2,
                auth: 'auth for 2',
                parents:
                 [ '0414bc2923fac741e4ccc8b71ffe3ea8106fffd15f0adcfd70aa3083b0e2c972' ] },
              { id: 'e3247eb823be0be2325f1a25251310179795387e41f3e0c0075061adbb2ba7c9',
                value: 3,
                auth: 'auth for 3',
                parents:
                 [ 'b553fc82acf93a408b2272c728a943ed8641f1bcad88e61e26b775e0431c67be' ] },
              { id: '0c392a1b92842de5c06cdae0b70159dcb0e6b1ae3f776e4af2d75d94b8830482',
                value: 4,
                auth: 'auth for 4',
                parents:
                 [ 'e3247eb823be0be2325f1a25251310179795387e41f3e0c0075061adbb2ba7c9' ] } ])
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
            expect(entries).to.deep.equal([
              { id: 'e3247eb823be0be2325f1a25251310179795387e41f3e0c0075061adbb2ba7c9',
                value: 3,
                auth: 'auth for 3',
                parents:
                 [ 'b553fc82acf93a408b2272c728a943ed8641f1bcad88e61e26b775e0431c67be' ] },
              { id: '0c392a1b92842de5c06cdae0b70159dcb0e6b1ae3f776e4af2d75d94b8830482',
                value: 4,
                auth: 'auth for 4',
                parents:
                 [ 'e3247eb823be0be2325f1a25251310179795387e41f3e0c0075061adbb2ba7c9' ] } ])
            done()
          })
        )
      })

      it('can stream entries since including', (done) => {
        expect(entryId).to.exist()
        pull(
          log.since(entryId, true),
          pull.collect((err, entries) => {
            expect(err).to.not.exist()
            expect(entries).to.deep.equal([
              { id: 'b553fc82acf93a408b2272c728a943ed8641f1bcad88e61e26b775e0431c67be',
                value: 2,
                auth: 'auth for 2',
                parents:
                 [ '0414bc2923fac741e4ccc8b71ffe3ea8106fffd15f0adcfd70aa3083b0e2c972' ] },
              { id: 'e3247eb823be0be2325f1a25251310179795387e41f3e0c0075061adbb2ba7c9',
                value: 3,
                auth: 'auth for 3',
                parents:
                 [ 'b553fc82acf93a408b2272c728a943ed8641f1bcad88e61e26b775e0431c67be' ] },
              { id: '0c392a1b92842de5c06cdae0b70159dcb0e6b1ae3f776e4af2d75d94b8830482',
                value: 4,
                auth: 'auth for 4',
                parents:
                 [ 'e3247eb823be0be2325f1a25251310179795387e41f3e0c0075061adbb2ba7c9' ] } ])
            done()
          })
        )
      })
    })

    describe('emits new head on append', () => {
      it('emits', (done) => {
        log.once('new head', (id) => {
          expect(id).to.equal('5ce9bba9ec28ce1974073f5fced8bc8b4b527fb596c2faaebd74f38d49dae173')
          done()
        })

        log.append(5, 'auth for 5').then((id) => entryIds.push(id))
      })
    })

    describe('merge', () => {
      it('merges', (done) => {
        log.on('new head', (id) => {
          pull(
            log.all(),
            pull.collect((err, entries) => {
              expect(err).to.not.exist()
              expect(entries).to.deep.equal([
                { id: '0414bc2923fac741e4ccc8b71ffe3ea8106fffd15f0adcfd70aa3083b0e2c972',
                  value: 1,
                  auth: 'auth for 1',
                  parents: [] },
                { id: 'b553fc82acf93a408b2272c728a943ed8641f1bcad88e61e26b775e0431c67be',
                  value: 2,
                  auth: 'auth for 2',
                  parents:
                   [ '0414bc2923fac741e4ccc8b71ffe3ea8106fffd15f0adcfd70aa3083b0e2c972' ] },
                { id: 'e3247eb823be0be2325f1a25251310179795387e41f3e0c0075061adbb2ba7c9',
                  value: 3,
                  auth: 'auth for 3',
                  parents:
                   [ 'b553fc82acf93a408b2272c728a943ed8641f1bcad88e61e26b775e0431c67be' ] },
                { id: '0c392a1b92842de5c06cdae0b70159dcb0e6b1ae3f776e4af2d75d94b8830482',
                  value: 4,
                  auth: 'auth for 4',
                  parents:
                   [ 'e3247eb823be0be2325f1a25251310179795387e41f3e0c0075061adbb2ba7c9' ] },
                { id: '5ce9bba9ec28ce1974073f5fced8bc8b4b527fb596c2faaebd74f38d49dae173',
                  value: 5,
                  auth: 'auth for 5',
                  parents:
                   [ '0c392a1b92842de5c06cdae0b70159dcb0e6b1ae3f776e4af2d75d94b8830482' ] },
                { id: '8a27a984f4c4f3e5c08069f29da53230441f140f3a8986ec595f96d7f702b9d3',
                  value: '2.1',
                  auth: 'auth for 2.1',
                  parents:
                   [ 'b553fc82acf93a408b2272c728a943ed8641f1bcad88e61e26b775e0431c67be' ] },
                { id: '3610b6f930f9bea60374669b32d9ac3563423c81a089de2cfb3033996fb1362e',
                  value: null,
                  auth: 'auth for null',
                  parents:
                  [ '5ce9bba9ec28ce1974073f5fced8bc8b4b527fb596c2faaebd74f38d49dae173',
                    '8a27a984f4c4f3e5c08069f29da53230441f140f3a8986ec595f96d7f702b9d3' ] } ])
              done()
            })
          )
        })

        log.append('2.1', 'auth for 2.1', entryId)
      })
    })

    describe('follows', () => {
      let more = false

      it('follows', (done) => {
        const f = log.follow()
        pull(
          f,
          pull.map((entry) => {
            if (!more) {
              more = true
              log.append(8, 'auth for 8')
            }
            if (entry.value === 8) {
              f.end()
            }
            return entry
          }),
          pull.collect((err, entries) => {
            expect(err).to.not.exist()
            expect(entries).to.deep.equal([
              { id: '0414bc2923fac741e4ccc8b71ffe3ea8106fffd15f0adcfd70aa3083b0e2c972',
                value: 1,
                auth: 'auth for 1',
                parents: [] },
              { id: 'b553fc82acf93a408b2272c728a943ed8641f1bcad88e61e26b775e0431c67be',
                value: 2,
                auth: 'auth for 2',
                parents:
                 [ '0414bc2923fac741e4ccc8b71ffe3ea8106fffd15f0adcfd70aa3083b0e2c972' ] },
              { id: 'e3247eb823be0be2325f1a25251310179795387e41f3e0c0075061adbb2ba7c9',
                value: 3,
                auth: 'auth for 3',
                parents:
                 [ 'b553fc82acf93a408b2272c728a943ed8641f1bcad88e61e26b775e0431c67be' ] },
              { id: '0c392a1b92842de5c06cdae0b70159dcb0e6b1ae3f776e4af2d75d94b8830482',
                value: 4,
                auth: 'auth for 4',
                parents:
                 [ 'e3247eb823be0be2325f1a25251310179795387e41f3e0c0075061adbb2ba7c9' ] },
              { id: '5ce9bba9ec28ce1974073f5fced8bc8b4b527fb596c2faaebd74f38d49dae173',
                value: 5,
                auth: 'auth for 5',
                parents:
                 [ '0c392a1b92842de5c06cdae0b70159dcb0e6b1ae3f776e4af2d75d94b8830482' ] },
              { id: '8a27a984f4c4f3e5c08069f29da53230441f140f3a8986ec595f96d7f702b9d3',
                value: '2.1',
                auth: 'auth for 2.1',
                parents:
                 [ 'b553fc82acf93a408b2272c728a943ed8641f1bcad88e61e26b775e0431c67be' ] },
              { id: '3610b6f930f9bea60374669b32d9ac3563423c81a089de2cfb3033996fb1362e',
                value: null,
                auth: 'auth for null',
                parents:
                [ '5ce9bba9ec28ce1974073f5fced8bc8b4b527fb596c2faaebd74f38d49dae173',
                  '8a27a984f4c4f3e5c08069f29da53230441f140f3a8986ec595f96d7f702b9d3' ] },
              { id: '2a14e7c39e5efc2beb583f3cce2b6094dc22181dc5b2580272329ff489258f8d',
                value: 6,
                auth: 'auth for 6',
                parents:
                 [ '3610b6f930f9bea60374669b32d9ac3563423c81a089de2cfb3033996fb1362e' ] },
              { id: '688d0d2652028affd48523562f2d73a5b391877a00264774c6c7b409eb97bab6',
                value: 7,
                auth: 'auth for 7',
                parents:
                 [ '2a14e7c39e5efc2beb583f3cce2b6094dc22181dc5b2580272329ff489258f8d' ] },
              { id: '9b4a78dcfd4a548fdaf530eee9ca22f8c2ffe2ca04a8777c40a4bf69bd1054c6',
                value: 8,
                auth: 'auth for 8',
                parents:
                 [ '688d0d2652028affd48523562f2d73a5b391877a00264774c6c7b409eb97bab6' ] } ])
            done()
          })
        )

        log.append(6, 'auth for 6')
        log.append(7, 'auth for 7')
      })
    })
  })
})

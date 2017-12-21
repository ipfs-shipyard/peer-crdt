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
      it('appends and merges', async () => {
        const concurrentHead = await log.append('2.1', 'auth for 2.1', entryId)
        return log.merge(concurrentHead)
      })

      it('merged', (done) => {
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
              { id: '0830347da83984090a971e8c378184c96631a859705ee8809829ce18f1f893ba',
                value: null,
                auth: null,
                parents:
                [ '5ce9bba9ec28ce1974073f5fced8bc8b4b527fb596c2faaebd74f38d49dae173',
                  '8a27a984f4c4f3e5c08069f29da53230441f140f3a8986ec595f96d7f702b9d3' ] } ])
            done()
          })
        )
      })

      it('since the merge', (done) => {
        log.append(6).then(() => {
          pull(
            log.since('0830347da83984090a971e8c378184c96631a859705ee8809829ce18f1f893ba'),
            pull.collect((err, entries) => {
              expect(err).to.not.exist()
              expect(entries).to.deep.equal([
                { id: '767076c7635a9061d74fc5d1df9ad07722decf7103ab67ff81c6e54e457a8ec3',
                  value: 6,
                  auth: 'auth for 6',
                  parents:
                   [ '0830347da83984090a971e8c378184c96631a859705ee8809829ce18f1f893ba' ] }
              ])
              done()
            })
          )
        })
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
              log.append(9, 'auth for 8')
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
              { id: '0830347da83984090a971e8c378184c96631a859705ee8809829ce18f1f893ba',
                value: null,
                auth: null,
                parents:
                [ '5ce9bba9ec28ce1974073f5fced8bc8b4b527fb596c2faaebd74f38d49dae173',
                  '8a27a984f4c4f3e5c08069f29da53230441f140f3a8986ec595f96d7f702b9d3' ] },
              { id: '767076c7635a9061d74fc5d1df9ad07722decf7103ab67ff81c6e54e457a8ec3',
                value: 6,
                auth: 'auth for 6',
                parents:
                 [ '0830347da83984090a971e8c378184c96631a859705ee8809829ce18f1f893ba' ] },
              { id: '01c9190af68e97db614f44883d789eb90823d8b8f79b2bca5c959f9be1caecf1',
                value: 7,
                auth: 'auth for 7',
                parents:
                 [ '767076c7635a9061d74fc5d1df9ad07722decf7103ab67ff81c6e54e457a8ec3' ] },
              { id: 'cb5492e843f572e2b8ce4715063b6a534a345e4114b7a14a4ab1d328d920804d',
                value: 8,
                auth: 'auth for 8',
                parents:
                 [ '01c9190af68e97db614f44883d789eb90823d8b8f79b2bca5c959f9be1caecf1' ] } ])
            done()
          })
        )

        log.append(7)
        log.append(8)
      })
    })
  })
})

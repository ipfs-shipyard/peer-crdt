/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const pull = require('pull-stream')

const Log = require('../src/log')
const Store = require('./helpers/store')
const encrypt = require('./helpers/encrypt')
const decrypt = require('./helpers/decrypt')

describe('log', () => {
  const logOptions = { encrypt, decrypt }
  const entryIds = []

  describe('constructor', () => {
    it('cannot create log without an id', () => {
      expect(() => Log()).to.throw('need log id')
    })

    it('cannot create log without a string id', () => {
      expect(() => Log(1)).to.throw('need log id to be a string')
    })

    it('can be created', () => {
      Log('some string', new Store(), () => {}, logOptions)
    })
  })

  describe('instance', () => {
    let log
    let entryId

    before(() => {
      log = Log('a', new Store(), async (value, parents) => 'auth for ' + value, logOptions)
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
        const log = Log('b', new Store(), async (entry) => 'auth for ' + entry, logOptions)
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
              { id: '0dc13aa88efbf83f66f6c4813b55205ad2ea0804cb6a43d7037303994bb2b01b',
                value: 1,
                auth: 'auth for 1',
                parents: [] },
              { id: '4333ec824ed79748d580daedbbf4a0a78e4469571714d7feb409f15c16efb6bd',
                value: 2,
                auth: 'auth for 2',
                parents:
                 [ '0dc13aa88efbf83f66f6c4813b55205ad2ea0804cb6a43d7037303994bb2b01b' ] },
              { id: '81fba0584e9b4ac6f853296261e4fa92c0f65ae906aa7bb67da615f687b233c5',
                value: 3,
                auth: 'auth for 3',
                parents:
                 [ '4333ec824ed79748d580daedbbf4a0a78e4469571714d7feb409f15c16efb6bd' ] },
              { id: '5e90a3544f39b9cf95464e3e74016836645aa8c8313c68cfaf0250094de25bc1',
                value: 4,
                auth: 'auth for 4',
                parents:
                 [ '81fba0584e9b4ac6f853296261e4fa92c0f65ae906aa7bb67da615f687b233c5' ] } ])
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
              { id: '0dc13aa88efbf83f66f6c4813b55205ad2ea0804cb6a43d7037303994bb2b01b',
                value: 1,
                auth: 'auth for 1',
                parents: [] },
              { id: '4333ec824ed79748d580daedbbf4a0a78e4469571714d7feb409f15c16efb6bd',
                value: 2,
                auth: 'auth for 2',
                parents:
                 [ '0dc13aa88efbf83f66f6c4813b55205ad2ea0804cb6a43d7037303994bb2b01b' ] },
              { id: '81fba0584e9b4ac6f853296261e4fa92c0f65ae906aa7bb67da615f687b233c5',
                value: 3,
                auth: 'auth for 3',
                parents:
                 [ '4333ec824ed79748d580daedbbf4a0a78e4469571714d7feb409f15c16efb6bd' ] },
              { id: '5e90a3544f39b9cf95464e3e74016836645aa8c8313c68cfaf0250094de25bc1',
                value: 4,
                auth: 'auth for 4',
                parents:
                 [ '81fba0584e9b4ac6f853296261e4fa92c0f65ae906aa7bb67da615f687b233c5' ] } ])
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
              { id: '0dc13aa88efbf83f66f6c4813b55205ad2ea0804cb6a43d7037303994bb2b01b',
                value: 1,
                auth: 'auth for 1',
                parents: [] },
              { id: '4333ec824ed79748d580daedbbf4a0a78e4469571714d7feb409f15c16efb6bd',
                value: 2,
                auth: 'auth for 2',
                parents:
                 [ '0dc13aa88efbf83f66f6c4813b55205ad2ea0804cb6a43d7037303994bb2b01b' ] },
              { id: '81fba0584e9b4ac6f853296261e4fa92c0f65ae906aa7bb67da615f687b233c5',
                value: 3,
                auth: 'auth for 3',
                parents:
                 [ '4333ec824ed79748d580daedbbf4a0a78e4469571714d7feb409f15c16efb6bd' ] },
              { id: '5e90a3544f39b9cf95464e3e74016836645aa8c8313c68cfaf0250094de25bc1',
                value: 4,
                auth: 'auth for 4',
                parents:
                 [ '81fba0584e9b4ac6f853296261e4fa92c0f65ae906aa7bb67da615f687b233c5' ] } ])
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
              { id: '81fba0584e9b4ac6f853296261e4fa92c0f65ae906aa7bb67da615f687b233c5',
                value: 3,
                auth: 'auth for 3',
                parents:
                 [ '4333ec824ed79748d580daedbbf4a0a78e4469571714d7feb409f15c16efb6bd' ] },
              { id: '5e90a3544f39b9cf95464e3e74016836645aa8c8313c68cfaf0250094de25bc1',
                value: 4,
                auth: 'auth for 4',
                parents:
                 [ '81fba0584e9b4ac6f853296261e4fa92c0f65ae906aa7bb67da615f687b233c5' ] } ])
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
              { id: '4333ec824ed79748d580daedbbf4a0a78e4469571714d7feb409f15c16efb6bd',
                value: 2,
                auth: 'auth for 2',
                parents:
                 [ '0dc13aa88efbf83f66f6c4813b55205ad2ea0804cb6a43d7037303994bb2b01b' ] },
              { id: '81fba0584e9b4ac6f853296261e4fa92c0f65ae906aa7bb67da615f687b233c5',
                value: 3,
                auth: 'auth for 3',
                parents:
                 [ '4333ec824ed79748d580daedbbf4a0a78e4469571714d7feb409f15c16efb6bd' ] },
              { id: '5e90a3544f39b9cf95464e3e74016836645aa8c8313c68cfaf0250094de25bc1',
                value: 4,
                auth: 'auth for 4',
                parents:
                 [ '81fba0584e9b4ac6f853296261e4fa92c0f65ae906aa7bb67da615f687b233c5' ] } ])
            done()
          })
        )
      })
    })

    describe('emits new head on append', () => {
      it('emits', (done) => {
        log.once('new head', (id) => {
          expect(id).to.equal('9a0f0b55b5e016aea3b76b9d31fc67393917e189707587b2691a4654b441113d')
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
              { id: '0dc13aa88efbf83f66f6c4813b55205ad2ea0804cb6a43d7037303994bb2b01b',
                value: 1,
                auth: 'auth for 1',
                parents: [] },
              { id: '4333ec824ed79748d580daedbbf4a0a78e4469571714d7feb409f15c16efb6bd',
                value: 2,
                auth: 'auth for 2',
                parents:
                 [ '0dc13aa88efbf83f66f6c4813b55205ad2ea0804cb6a43d7037303994bb2b01b' ] },
              { id: '7b1063df90c86d60b1d9280705301b6bbb98b9e072cf144e955385741b21ca0b',
                value: '2.1',
                auth: 'auth for 2.1',
                parents:
                 [ '4333ec824ed79748d580daedbbf4a0a78e4469571714d7feb409f15c16efb6bd' ] },
              { id: '81fba0584e9b4ac6f853296261e4fa92c0f65ae906aa7bb67da615f687b233c5',
                value: 3,
                auth: 'auth for 3',
                parents:
                 [ '4333ec824ed79748d580daedbbf4a0a78e4469571714d7feb409f15c16efb6bd' ] },
              { id: '5e90a3544f39b9cf95464e3e74016836645aa8c8313c68cfaf0250094de25bc1',
                value: 4,
                auth: 'auth for 4',
                parents:
                 [ '81fba0584e9b4ac6f853296261e4fa92c0f65ae906aa7bb67da615f687b233c5' ] },
              { id: '9a0f0b55b5e016aea3b76b9d31fc67393917e189707587b2691a4654b441113d',
                value: 5,
                auth: 'auth for 5',
                parents:
                 [ '5e90a3544f39b9cf95464e3e74016836645aa8c8313c68cfaf0250094de25bc1' ] },
              { id: 'd736381053457d521b854535956e3baf2a8aac83b836b85e480e1645948e5fc3',
                value: null,
                auth: null,
                parents:
                [ '7b1063df90c86d60b1d9280705301b6bbb98b9e072cf144e955385741b21ca0b',
                  '9a0f0b55b5e016aea3b76b9d31fc67393917e189707587b2691a4654b441113d' ] } ])
            done()
          })
        )
      })

      it('since the merge', (done) => {
        log.append(6).then(() => {
          pull(
            log.since('d736381053457d521b854535956e3baf2a8aac83b836b85e480e1645948e5fc3'),
            pull.collect((err, entries) => {
              expect(err).to.not.exist()
              expect(entries).to.deep.equal([
                { id: '564edac7d46057f4e9f256d857145200a794d156065c490cfc4068533a7aee4b',
                  value: 6,
                  auth: 'auth for 6',
                  parents:
                   [ 'd736381053457d521b854535956e3baf2a8aac83b836b85e480e1645948e5fc3' ] }
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
              { id: '0dc13aa88efbf83f66f6c4813b55205ad2ea0804cb6a43d7037303994bb2b01b',
                value: 1,
                auth: 'auth for 1',
                parents: [] },
              { id: '4333ec824ed79748d580daedbbf4a0a78e4469571714d7feb409f15c16efb6bd',
                value: 2,
                auth: 'auth for 2',
                parents:
                 [ '0dc13aa88efbf83f66f6c4813b55205ad2ea0804cb6a43d7037303994bb2b01b' ] },
              { id: '7b1063df90c86d60b1d9280705301b6bbb98b9e072cf144e955385741b21ca0b',
                value: '2.1',
                auth: 'auth for 2.1',
                parents:
                 [ '4333ec824ed79748d580daedbbf4a0a78e4469571714d7feb409f15c16efb6bd' ] },
              { id: '81fba0584e9b4ac6f853296261e4fa92c0f65ae906aa7bb67da615f687b233c5',
                value: 3,
                auth: 'auth for 3',
                parents:
                 [ '4333ec824ed79748d580daedbbf4a0a78e4469571714d7feb409f15c16efb6bd' ] },
              { id: '5e90a3544f39b9cf95464e3e74016836645aa8c8313c68cfaf0250094de25bc1',
                value: 4,
                auth: 'auth for 4',
                parents:
                 [ '81fba0584e9b4ac6f853296261e4fa92c0f65ae906aa7bb67da615f687b233c5' ] },
              { id: '9a0f0b55b5e016aea3b76b9d31fc67393917e189707587b2691a4654b441113d',
                value: 5,
                auth: 'auth for 5',
                parents:
                 [ '5e90a3544f39b9cf95464e3e74016836645aa8c8313c68cfaf0250094de25bc1' ] },
              { id: 'd736381053457d521b854535956e3baf2a8aac83b836b85e480e1645948e5fc3',
                value: null,
                auth: null,
                parents:
                [ '7b1063df90c86d60b1d9280705301b6bbb98b9e072cf144e955385741b21ca0b',
                  '9a0f0b55b5e016aea3b76b9d31fc67393917e189707587b2691a4654b441113d' ] },
              { id: '564edac7d46057f4e9f256d857145200a794d156065c490cfc4068533a7aee4b',
                value: 6,
                auth: 'auth for 6',
                parents:
                 [ 'd736381053457d521b854535956e3baf2a8aac83b836b85e480e1645948e5fc3' ] },
              { id: '98bf4124b66b4f34c323a7608e08742edd8e57e9abcd8a1aac9259825ab63db7',
                value: 7,
                auth: 'auth for 7',
                parents:
                 [ '564edac7d46057f4e9f256d857145200a794d156065c490cfc4068533a7aee4b' ] },
              { id: '3b719e561fa287e11a9a3a213622152f0ce658195d2e48164ae26bd42c98abd8',
                value: 8,
                auth: 'auth for 8',
                parents:
                 [ '98bf4124b66b4f34c323a7608e08742edd8e57e9abcd8a1aac9259825ab63db7' ] } ])
            done()
          })
        )

        log.append(7)
        log.append(8)
      })
    })
  })
})

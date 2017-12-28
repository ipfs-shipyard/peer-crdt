/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const series = require('async/series')

const Store = require('./helpers/store')
const Network = require('./helpers/network')
const CRDT = require('../')

describe('types', () => {
  let myCRDT

  before(() => {
    myCRDT = CRDT.defaults({
      store: (id) => new Store(id),
      network: (id, log, onRemoteHead) => new Network(id, log, onRemoteHead, 100)
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

      const changes = [0, 0]
      instances.forEach((instance, i) => instance.on('change', () => { changes[i]++ }))

      instances[0].increment()
      instances[0].increment()
      instances[1].increment()
      instances[0].increment()
      instances[1].increment()
      instances[1].increment()
      instances[1].increment()

      setTimeout(() => {
        expect(instances.map((i) => i.value())).to.deep.equal([7, 7])
        expect(changes).to.deep.equal([7, 7])
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

      const changes = [0, 0]
      instances.forEach((instance, i) => instance.on('change', () => { changes[i]++ }))

      instances[0].increment()
      instances[0].increment()
      instances[1].increment()
      instances[0].decrement()
      instances[1].increment()
      instances[1].decrement()
      instances[1].increment()

      setTimeout(() => {
        expect(instances.map((i) => i.value())).to.deep.equal([3, 3])
        expect(changes).to.deep.equal([7, 7])
        done()
      }, 2000)
    })
  })

  describe('g-set', () => {
    let instances

    before(() => {
      instances = [
        myCRDT.create('g-set', 'g-set-test', {
          authenticate: (entry, parents) => 'authentication for 0 ' + JSON.stringify([entry, parents])
        }),
        myCRDT.create('g-set', 'g-set-test', {
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

      const changes = [0, 0]
      instances.forEach((instance, i) => instance.on('change', () => { changes[i]++ }))

      instances[0].add('a')
      instances[0].add('b')
      instances[1].add('c')
      instances[0].add('d')
      instances[1].add('e')
      instances[1].add('f')
      instances[1].add('g')

      setTimeout(() => {
        instances.forEach((i) => {
          expect(Array.from(i.value()).sort()).to.deep.equal(['a', 'b', 'c', 'd', 'e', 'f', 'g'])
        })
        expect(changes).to.deep.equal([7, 7])
        done()
      }, 2000)
    })
  })

  describe('2p-set', () => {
    let instances

    before(() => {
      instances = [
        myCRDT.create('2p-set', '2p-set-test', {
          authenticate: (entry, parents) => 'authentication for 0 ' + JSON.stringify([entry, parents])
        }),
        myCRDT.create('2p-set', '2p-set-test', {
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

      const changes = [0, 0]
      instances.forEach((instance, i) => instance.on('change', () => { changes[i]++ }))

      instances[0].add('a')
      instances[0].add('b')
      instances[1].remove('a')
      instances[0].add('c')
      instances[1].add('d')
      instances[1].remove('b')
      instances[1].remove('g')

      setTimeout(() => {
        instances.forEach((i) => {
          expect(Array.from(i.value()).sort()).to.deep.equal(['c', 'd'])
        })
        expect(changes).to.deep.equal([7, 7])
        done()
      }, 2000)
    })
  })

  describe('lww-set', () => {
    let instances

    before(() => {
      instances = [
        myCRDT.create('lww-set', 'lww-set-test', {
          authenticate: (entry, parents) => 'authentication for 0 ' + JSON.stringify([entry, parents])
        }),
        myCRDT.create('lww-set', 'lww-set-test', {
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

      const changes = [0, 0]
      instances.forEach((instance, i) => instance.on('change', () => { changes[i]++ }))

      instances[0].add('a')
      instances[0].add('b')
      instances[0].add('c')
      instances[0].remove('a')
      instances[1].remove('d')

      setTimeout(() => {
        instances.forEach((i) => {
          expect(Array.from(i.value()).sort()).to.deep.equal(['b', 'c'])
        })

        instances[1].add('d')
        instances[1].add('a')
        instances[1].remove('b')
        instances[1].remove('g')

        setTimeout(() => {
          instances.forEach((i) => {
            expect(Array.from(i.value()).sort()).to.deep.equal(['a', 'c', 'd'])
          })
          expect(changes).to.deep.equal([9, 9])
          done()
        }, 1000)
      }, 1000)
    })
  })

  describe('or-set', () => {
    let instances

    before(() => {
      instances = [
        myCRDT.create('or-set', 'or-set-test', {
          authenticate: (entry, parents) => 'authentication for 0 ' + JSON.stringify([entry, parents])
        }),
        myCRDT.create('or-set', 'or-set-test', {
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

      const changes = [0, 0]
      instances.forEach((instance, i) => instance.on('change', () => { changes[i]++ }))

      instances[0].add('a')
      instances[0].add('b')
      instances[0].add('c')
      instances[0].remove('a')
      instances[1].remove('d')

      setTimeout(() => {
        instances.forEach((i) => {
          expect(i.value().sort()).to.deep.equal(['a', 'b', 'c'])
        })

        instances[1].add('d')
        instances[1].add('a')
        instances[1].remove('b')
        instances[1].remove('g')

        setTimeout(() => {
          instances.forEach((i) => {
            expect(i.value().sort()).to.deep.equal(['a', 'c', 'd'])
          })
          expect(changes).to.deep.equal([6, 6])
          done()
        }, 1000)
      }, 1000)
    })
  })

  describe('rga', () => {
    let instances

    before(() => {
      instances = [
        myCRDT.create('rga', 'rga-test', {
          authenticate: (entry, parents) => 'authentication for 0 ' + JSON.stringify([entry, parents])
        }),
        myCRDT.create('rga', 'rga-test', {
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
      this.timeout(7000)

      let last

      const changes = [0, 0]
      instances.forEach((instance, i) => instance.on('change', () => { changes[i]++ }))

      instances[0].push('a')
      instances[1].push('b')

      series([
        (cb) => setTimeout(cb, 1000),
        (cb) => {
          const result1 = instances[0].value()
          const result2 = instances[1].value()
          expect(result2).to.deep.equal(result1)
          expect(result1.sort()).to.deep.equal(['a', 'b'])
          cb()
        },
        (cb) => {
          instances[0].push('c')
          instances[1].push('d')
          cb()
        },
        (cb) => setTimeout(cb, 1000),
        (cb) => {
          let result
          instances.forEach((i) => {
            if (result) {
              expect(i.value()).to.deep.equal(result)
            } else {
              result = i.value()
            }
          })
          expect(result.slice(2).sort()).to.deep.equal(['c', 'd'])
          expect(instances[1].value()).to.deep.equal(result)
          expect(result.sort()).to.deep.equal(['a', 'b', 'c', 'd'])
          cb()
        },
        (cb) => {
          instances[0].removeAt(3)
          instances[0].removeAt(3)
          cb()
        },
        (cb) => setTimeout(cb, 1000),
        (cb) => {
          instances.forEach((i) => {
            expect(i.value().sort()).to.deep.equal(['a', 'b', 'd'])
          })
          cb()
        },
        (cb) => {
          instances[0].set(5, 'e')
          instances[1].set(5, 'f')
          cb()
        },
        (cb) => setTimeout(cb, 1000),
        (cb) => {
          instances.forEach((i) => {
            const value = i.value()
            expect(value.slice(3).sort()).to.deep.equal(['e', 'f', null, null, null, null])
          })
          cb()
        },
        (cb) => {
          instances[0].insertAt(1, 'g')
          instances[1].insertAt(1, 'h')
          cb()
        },
        (cb) => setTimeout(cb, 1000),
        (cb) => {
          instances.forEach((i) => {
            const value = last = i.value()
            expect(value.slice(1, 3).sort()).to.deep.equal(['g', 'h'])
          })
          cb()
        },
        (cb) => {
          instances[0].set(2, 'i')
          instances[0].set(2, 'i')
          cb()
        },
        (cb) => setTimeout(cb, 1000),
        (cb) => {
          instances.forEach((i) => {
            const value = i.value()
            const expected = last.slice(0, 2).concat(['i', 'i']).concat(last.slice(3))
            expect(value).to.deep.equal(expected)
          })
          cb()
        },
        (cb) => {
          expect(changes).to.deep.equal([18, 18])
          cb()
        }
      ], done)
    })
  })

  describe('treedoc', () => {
    let instances
    let last

    before(() => {
      instances = [
        myCRDT.create('treedoc', 'treedoc-test', {
          authenticate: (entry, parents) => 'authentication for 0 ' + JSON.stringify([entry, parents])
        }),
        myCRDT.create('treedoc', 'treedoc-test', {
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
      this.timeout(8000)

      const changes = [0, 0]
      instances.forEach((instance, i) => instance.on('change', () => { changes[i]++ }))

      instances[0].push('a')
      instances[1].push('b')

      series([
        (cb) => setTimeout(cb, 1000),
        (cb) => {
          const result1 = instances[0].value()
          const result2 = instances[1].value()
          expect(result2).to.deep.equal(result1)
          expect(result1.sort()).to.deep.equal(['a', 'b'])
          cb()
        },
        (cb) => {
          instances[0].push('c')
          instances[1].push('d')
          cb()
        },
        (cb) => setTimeout(cb, 1000),
        (cb) => {
          let result
          instances.forEach((i) => {
            if (result) {
              expect(i.value()).to.deep.equal(result)
            } else {
              result = i.value()
            }
          })
          expect(result.slice(2).sort()).to.deep.equal(['c', 'd'])
          expect(instances[1].value()).to.deep.equal(result)
          expect(result.sort()).to.deep.equal(['a', 'b', 'c', 'd'])
          cb()
        },
        (cb) => {
          instances[0].removeAt(3)
          instances[0].removeAt(3)
          cb()
        },
        (cb) => setTimeout(cb, 1000),
        (cb) => {
          instances.forEach((i) => {
            expect(i.value().sort()).to.deep.equal(['a', 'b', 'c'])
          })
          cb()
        },
        (cb) => {
          instances[0].set(5, 'e')
          instances[1].set(5, 'f')
          cb()
        },
        (cb) => setTimeout(cb, 1000),
        (cb) => {
          instances.forEach((i) => {
            const value = i.value()
            expect(value.slice(3).sort()).to.deep.equal(['e', 'f', null, null, null, null])
          })
          cb()
        },
        (cb) => {
          instances[0].insertAt(1, 'g')
          instances[1].insertAt(1, 'h')
          cb()
        },
        (cb) => setTimeout(cb, 1000),
        (cb) => {
          instances.forEach((i) => {
            const value = last = i.value()
            expect(value.slice(1, 3).sort()).to.deep.equal(['g', 'h'])
          })
          cb()
        },
        (cb) => {
          instances[0].set(2, 'i')
          instances[0].set(2, 'i')
          cb()
        },
        (cb) => setTimeout(cb, 1000),
        (cb) => {
          instances.forEach((i) => {
            const value = i.value()
            const expected = last.slice(0, 2).concat(['i', 'i']).concat(last.slice(3))
            expect(value).to.deep.equal(expected)
          })
          cb()
        },
        (cb) => {
          instances[0].insertAt(1, 'j')
          instances[0].insertAt(1, 'j')
          cb()
        },
        (cb) => setTimeout(cb, 1000),
        (cb) => {
          instances.forEach((i) => {
            const value = last = i.value()
            expect(value.slice(1, 3).sort()).to.deep.equal(['j', 'j'])
          })
          cb()
        },
        (cb) => {
          expect(changes).to.deep.equal([18, 18])
          cb()
        }
      ], done)
    })
  })

  describe('lww-register', () => {
    let instances

    before(() => {
      instances = [
        myCRDT.create('lww-register', 'lww-register-test', {
          authenticate: (entry, parents) => 'authentication for 0 ' + JSON.stringify([entry, parents])
        }),
        myCRDT.create('lww-register', 'lww-register-test', {
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
      const changes = [0, 0]
      instances.forEach((instance, i) => instance.on('change', () => { changes[i]++ }))

      instances[0].set('a', 'b')
      instances[1].set('a', 'c')

      series([
        (cb) => setTimeout(cb, 1000),
        (cb) => {
          let result
          instances.forEach((i) => {
            const r = i.value().get('a')
            if (!result) {
              result = r
            } else {
              expect(r).to.equal(result)
            }
            expect(r).to.be.oneOf(['b', 'c'])
          })
          cb()
        },
        (cb) => {
          instances[0].set('d', 'e')
          instances[1].set('e', 'f')
          cb()
        },
        (cb) => setTimeout(cb, 1000),
        (cb) => {
          let result
          instances.forEach((i) => {
            const value = i.value()
            expect(value.get('d')).to.equal('e')
            expect(value.get('e')).to.equal('f')

            const r = [...value].sort()
            if (!result) {
              result = r
            } else {
              expect(r).to.deep.equal(result)
            }
          })
          cb()
        },
        (cb) => {
          expect(changes).to.deep.equal([4, 4])
          cb()
        }
      ], done)
    })
  })
})

process.on('unhandledRejection', (rej) => {
  console.log(rej)
})

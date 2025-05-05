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
const encrypt = require('./helpers/encrypt')
const decrypt = require('./helpers/decrypt')

const A_BIT = 1000

describe('types', () => {
  let myCRDT

  before(() => {
    myCRDT = CRDT.defaults({
      store: (id) => new Store(id),
      network: (id, log, onRemoteHead) => new Network(id, log, onRemoteHead, 100),
      signAndEncrypt: encrypt,
      decryptAndVerify: decrypt
    })
  })

  describe('g-counter', () => {
    let instances

    before(() => {
      instances = [
        myCRDT.create('g-counter', 'g-counter-test', {
          sign: (entry, parents) => 'authentication for 0 ' + JSON.stringify([entry, parents]),
          authenticate: (entry, parents, signature) => 'authentication for 1 ' + JSON.stringify([entry, parents]) === signature
        }),
        myCRDT.create('g-counter', 'g-counter-test', {
          sign: (entry, parents) => 'authentication for 1 ' + JSON.stringify([entry, parents]),
          authenticate: (entry, parents, signature) => 'authentication for 0 ' + JSON.stringify([entry, parents]) === signature
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
          sign: (entry, parents) => 'authentication for 0 ' + JSON.stringify([entry, parents]),
          authenticate: (entry, parents, signature) => 'authentication for 1 ' + JSON.stringify([entry, parents]) === signature
        }),
        myCRDT.create('pn-counter', 'pn-counter-test', {
          sign: (entry, parents) => 'authentication for 1 ' + JSON.stringify([entry, parents]),
          authenticate: (entry, parents, signature) => 'authentication for 0 ' + JSON.stringify([entry, parents]) === signature
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
        expect(changes).to.deep.equal([14, 14])
        done()
      }, 2000)
    })
  })

  describe('g-set', () => {
    let instances

    before(() => {
      instances = [
        myCRDT.create('g-set', 'g-set-test', {
          sign: (entry, parents) => 'authentication for 0 ' + JSON.stringify([entry, parents]),
          authenticate: (entry, parents, signature) => 'authentication for 1 ' + JSON.stringify([entry, parents]) === signature
        }),
        myCRDT.create('g-set', 'g-set-test', {
          sign: (entry, parents) => 'authentication for 1 ' + JSON.stringify([entry, parents]),
          authenticate: (entry, parents, signature) => 'authentication for 0 ' + JSON.stringify([entry, parents]) === signature
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
          sign: (entry, parents) => 'authentication for 0 ' + JSON.stringify([entry, parents]),
          authenticate: (entry, parents, signature) => 'authentication for 1 ' + JSON.stringify([entry, parents]) === signature
        }),
        myCRDT.create('2p-set', '2p-set-test', {
          sign: (entry, parents) => 'authentication for 1 ' + JSON.stringify([entry, parents]),
          authenticate: (entry, parents, signature) => 'authentication for 0 ' + JSON.stringify([entry, parents]) === signature
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
        expect(changes).to.deep.equal([14, 14])
        done()
      }, 2000)
    })
  })

  describe('lww-set', () => {
    let instances

    before(() => {
      instances = [
        myCRDT.create('lww-set', 'lww-set-test', {
          sign: (entry, parents) => 'authentication for 0 ' + JSON.stringify([entry, parents]),
          authenticate: (entry, parents, signature) => 'authentication for 1 ' + JSON.stringify([entry, parents]) === signature
        }),
        myCRDT.create('lww-set', 'lww-set-test', {
          sign: (entry, parents) => 'authentication for 1 ' + JSON.stringify([entry, parents]),
          authenticate: (entry, parents, signature) => 'authentication for 0 ' + JSON.stringify([entry, parents]) === signature
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
        }, A_BIT)
      }, A_BIT)
    })
  })

  describe('or-set', () => {
    let instances

    before(() => {
      instances = [
        myCRDT.create('or-set', 'or-set-test', {
          sign: (entry, parents) => 'authentication for 0 ' + JSON.stringify([entry, parents]),
          authenticate: (entry, parents, signature) => 'authentication for 1 ' + JSON.stringify([entry, parents]) === signature
        }),
        myCRDT.create('or-set', 'or-set-test', {
          sign: (entry, parents) => 'authentication for 1 ' + JSON.stringify([entry, parents]),
          authenticate: (entry, parents, signature) => 'authentication for 0 ' + JSON.stringify([entry, parents]) === signature
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
        }, A_BIT)
      }, A_BIT)
    })
  })

  describe('rga', () => {
    let instances

    before(() => {
      instances = [
        myCRDT.create('rga', 'rga-test', {
          sign: (entry, parents) => 'authentication for 0 ' + JSON.stringify([entry, parents]),
          authenticate: (entry, parents, signature) => 'authentication for 1 ' + JSON.stringify([entry, parents]) === signature
        }),
        myCRDT.create('rga', 'rga-test', {
          sign: (entry, parents) => 'authentication for 1 ' + JSON.stringify([entry, parents]),
          authenticate: (entry, parents, signature) => 'authentication for 0 ' + JSON.stringify([entry, parents]) === signature
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
        (cb) => setTimeout(cb, A_BIT),
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
        (cb) => setTimeout(cb, A_BIT),
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
        (cb) => setTimeout(cb, A_BIT),
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
        (cb) => setTimeout(cb, A_BIT),
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
        (cb) => setTimeout(cb, A_BIT),
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
        (cb) => setTimeout(cb, A_BIT),
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
          sign: (entry, parents) => 'authentication for 0 ' + JSON.stringify([entry, parents]),
          authenticate: (entry, parents, signature) => 'authentication for 1 ' + JSON.stringify([entry, parents]) === signature
        }),
        myCRDT.create('treedoc', 'treedoc-test', {
          sign: (entry, parents) => 'authentication for 1 ' + JSON.stringify([entry, parents]),
          authenticate: (entry, parents, signature) => 'authentication for 0 ' + JSON.stringify([entry, parents]) === signature
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
        (cb) => setTimeout(cb, A_BIT),
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
        (cb) => setTimeout(cb, A_BIT),
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
        (cb) => setTimeout(cb, A_BIT),
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
        (cb) => setTimeout(cb, A_BIT),
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
        (cb) => setTimeout(cb, A_BIT),
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
        (cb) => setTimeout(cb, A_BIT),
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
        (cb) => setTimeout(cb, A_BIT),
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
          sign: (entry, parents) => 'authentication for 0 ' + JSON.stringify([entry, parents]),
          authenticate: (entry, parents, signature) => 'authentication for 1 ' + JSON.stringify([entry, parents]) === signature
        }),
        myCRDT.create('lww-register', 'lww-register-test', {
          sign: (entry, parents) => 'authentication for 1 ' + JSON.stringify([entry, parents]),
          authenticate: (entry, parents, signature) => 'authentication for 0 ' + JSON.stringify([entry, parents]) === signature
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
        (cb) => setTimeout(cb, A_BIT),
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
        (cb) => setTimeout(cb, A_BIT),
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
          expect(changes).to.deep.equal([3, 3])
          cb()
        }
      ], done)
    })
  })

  describe('mv-register', () => {
    let instances

    before(() => {
      instances = [
        myCRDT.create('mv-register', 'mv-register-test', {
          sign: (entry, parents) => 'authentication for 0 ' + JSON.stringify([entry, parents]),
          authenticate: (entry, parents, signature) => 'authentication for 1 ' + JSON.stringify([entry, parents]) === signature
        }),
        myCRDT.create('mv-register', 'mv-register-test', {
          sign: (entry, parents) => 'authentication for 1 ' + JSON.stringify([entry, parents]),
          authenticate: (entry, parents, signature) => 'authentication for 0 ' + JSON.stringify([entry, parents]) === signature
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
      this.timeout(4000)
      const changes = [0, 0]
      instances.forEach((instance, i) => instance.on('change', () => { changes[i]++ }))

      instances[0].set('a', 'b')
      instances[1].set('a', 'c')

      series([
        (cb) => setTimeout(cb, A_BIT),
        (cb) => {
          instances.forEach((i) => {
            const r = i.value().get('a').sort()
            expect(r).to.deep.equal(['b', 'c'])
          })
          cb()
        },
        (cb) => {
          instances[0].set('a', 'd')
          instances[1].set('a', 'e')
          cb()
        },
        (cb) => setTimeout(cb, A_BIT),
        (cb) => {
          instances.forEach((i) => {
            const r = i.value().get('a').sort()
            expect(r).to.deep.equal(['d', 'e'])
          })
          cb()
        },
        (cb) => {
          instances[0].set('a', 'f')
          cb()
        },
        (cb) => setTimeout(cb, A_BIT),
        (cb) => {
          instances.forEach((i) => {
            const r = i.value().get('a').sort()
            expect(r).to.deep.equal(['f'])
          })
          cb()
        },
        (cb) => {
          expect(changes).to.deep.equal([5, 5])
          cb()
        }
      ], done)
    })
  })

  describe('treedoc-text', () => {
    let instances

    before(() => {
      instances = [
        myCRDT.create('treedoc-text', 'treedoc-text-test', {
          sign: (entry, parents) => 'authentication for 0 ' + JSON.stringify([entry, parents]),
          authenticate: (entry, parents, signature) => 'authentication for 1 ' + JSON.stringify([entry, parents]) === signature
        }),
        myCRDT.create('treedoc-text', 'treedoc-text-test', {
          sign: (entry, parents) => 'authentication for 1 ' + JSON.stringify([entry, parents]),
          authenticate: (entry, parents, signature) => 'authentication for 0 ' + JSON.stringify([entry, parents]) === signature
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
      this.timeout(15000)
      const changes = [0, 0]
      let changeEvents = [[], []]
      instances.forEach((instance, i) => instance.on('change', (event) => {
        changeEvents[i].push(event)
        changes[i]++
      }))

      series([
        (cb) => {
          instances[0].push('abc')
          instances[1].push('def')
          cb()
        },
        (cb) => setTimeout(cb, A_BIT),
        (cb) => {
          expectConvergenceOnValue(instances, 'abcdef')
          expect(changeEvents[0]).to.have.lengthOf(2)

          const ev1 = changeEvents[0][0]
          expect(ev1.type).to.equal('insert')
          expect(ev1.atom).to.equal('abc')
          expect(ev1.pos).to.equal(0)

          const ev2 = changeEvents[0][1]
          expect(ev2.type).to.equal('insert')
          expect(ev2.atom).to.equal('def')
          expect(ev2.pos).to.equal(3)

          changeEvents = [[], []]
          cb()
        },
        (cb) => {
          instances[0].insertAt(0, 'ABC')
          cb()
        },
        (cb) => setTimeout(cb, A_BIT),
        (cb) => {
          expectConvergenceOnValue(instances, 'ABCabcdef')
          expect(changeEvents[0]).to.have.lengthOf(1)

          const ev1 = changeEvents[0][0]
          expect(ev1.type).to.equal('insert')
          expect(ev1.atom).to.equal('ABC')
          expect(ev1.pos).to.equal(0)

          changeEvents = [[], []]
          cb()
        },
        (cb) => {
          instances[0].insertAt(3, 'DEF')
          cb()
        },
        (cb) => setTimeout(cb, A_BIT),
        (cb) => {
          expectConvergenceOnValue(instances, 'ABCDEFabcdef')
          expect(changeEvents[0]).to.have.lengthOf(1)
          const ev1 = changeEvents[0][0]
          expect(ev1.type).to.equal('insert')
          expect(ev1.atom).to.equal('DEF')
          expect(ev1.pos).to.equal(3)

          changeEvents = [[], []]
          cb()
        },
        (cb) => {
          instances[0].insertAt(1, '||')
          cb()
        },
        (cb) => setTimeout(cb, A_BIT),
        (cb) => {
          expectConvergenceOnValue(instances, 'A||BCDEFabcdef')
          expect(changeEvents[0]).to.have.lengthOf(4)

          const ev1 = changeEvents[0][0]
          expect(ev1.type).to.equal('delete')
          expect(ev1.deleted).to.equal('ABC')
          expect(ev1.pos).to.equal(0)
          expect(ev1.length).to.equal(3)

          const ev2 = changeEvents[0][1]
          expect(ev2.type).to.equal('insert')
          expect(ev2.atom).to.equal('A')
          expect(ev2.pos).to.equal(0)

          const ev3 = changeEvents[0][2]
          expect(ev3.type).to.equal('insert')
          expect(ev3.atom).to.equal('BC')
          expect(ev3.pos).to.equal(1)

          const ev4 = changeEvents[0][3]
          expect(ev4.type).to.equal('insert')
          expect(ev4.atom).to.equal('||')
          expect(ev4.pos).to.equal(1)

          changeEvents = [[], []]

          cb()
        },
        (cb) => {
          instances[0].insertAt(2, '..')
          cb()
        },
        (cb) => setTimeout(cb, A_BIT),
        (cb) => {
          expectConvergenceOnValue(instances, 'A|..|BCDEFabcdef')
          expect(changeEvents[0]).to.have.lengthOf(4)

          const ev1 = changeEvents[0][0]
          expect(ev1.type).to.equal('delete')
          expect(ev1.deleted).to.equal('||')
          expect(ev1.pos).to.equal(1)
          expect(ev1.length).to.equal(2)

          const ev2 = changeEvents[0][1]
          expect(ev2.type).to.equal('insert')
          expect(ev2.atom).to.equal('|')
          expect(ev2.pos).to.equal(1)

          const ev3 = changeEvents[0][2]
          expect(ev3.type).to.equal('insert')
          expect(ev3.atom).to.equal('|')
          expect(ev3.pos).to.equal(2)

          const ev4 = changeEvents[0][3]
          expect(ev4.type).to.equal('insert')
          expect(ev4.atom).to.equal('..')
          expect(ev4.pos).to.equal(2)

          changeEvents = [[], []]

          cb()
        },
        (cb) => {
          instances[0].insertAt(16, '---')
          cb()
        },
        (cb) => setTimeout(cb, A_BIT),
        (cb) => {
          expectConvergenceOnValue(instances, 'A|..|BCDEFabcdef---')
          expect(changeEvents[0]).to.have.lengthOf(1)

          const ev1 = changeEvents[0][0]
          expect(ev1.type).to.equal('insert')
          expect(ev1.atom).to.equal('---')
          expect(ev1.pos).to.equal(16)

          changeEvents = [[], []]

          cb()
        },

        // test remove
        (cb) => {
          instances[0].removeAt(0)
          cb()
        },
        (cb) => setTimeout(cb, A_BIT),
        (cb) => {
          expectConvergenceOnValue(instances, '|..|BCDEFabcdef---')
          expect(changeEvents[0]).to.have.lengthOf(1)

          const ev1 = changeEvents[0][0]
          expect(ev1.type).to.equal('delete')
          expect(ev1.deleted).to.equal('A')
          expect(ev1.pos).to.equal(0)
          expect(ev1.length).to.equal(1)

          changeEvents = [[], []]

          cb()
        },
        (cb) => {
          instances[0].removeAt(9, 3)
          cb()
        },
        (cb) => setTimeout(cb, A_BIT),
        (cb) => {
          expectConvergenceOnValue(instances, '|..|BCDEFdef---')
          expect(changeEvents[0]).to.have.lengthOf(1)

          const ev1 = changeEvents[0][0]
          expect(ev1.type).to.equal('delete')
          expect(ev1.deleted).to.equal('abc')
          expect(ev1.pos).to.equal(9)
          expect(ev1.length).to.equal(3)

          changeEvents = [[], []]

          cb()
        },
        (cb) => {
          instances[0].removeAt(6)
          cb()
        },
        (cb) => setTimeout(cb, A_BIT),
        (cb) => {
          expectConvergenceOnValue(instances, '|..|BCEFdef---')
          expect(changeEvents[0]).to.have.lengthOf(2)

          const ev1 = changeEvents[0][0]
          expect(ev1.type).to.equal('delete')
          expect(ev1.deleted).to.equal('DEF')
          expect(ev1.pos).to.equal(6)
          expect(ev1.length).to.equal(3)

          const ev2 = changeEvents[0][1]
          expect(ev2.type).to.equal('insert')
          expect(ev2.atom).to.equal('EF')
          expect(ev2.pos).to.equal(6)

          changeEvents = [[], []]
          cb()
        },
        (cb) => {
          instances[0].removeAt(8, 4)
          cb()
        },
        (cb) => setTimeout(cb, A_BIT),
        (cb) => {
          expectConvergenceOnValue(instances, '|..|BCEF--')
          expect(changeEvents[0]).to.have.lengthOf(3)

          const ev1 = changeEvents[0][0]
          expect(ev1.type).to.equal('delete')
          expect(ev1.deleted).to.equal('def')
          expect(ev1.pos).to.equal(8)
          expect(ev1.length).to.equal(3)

          const ev2 = changeEvents[0][1]
          expect(ev2.type).to.equal('delete')
          expect(ev2.deleted).to.equal('---')
          expect(ev2.pos).to.equal(8)
          expect(ev2.length).to.equal(3)

          const ev3 = changeEvents[0][2]
          expect(ev3.type).to.equal('insert')
          expect(ev3.atom).to.equal('--')
          expect(ev3.pos).to.equal(8)

          changeEvents = [[], []]

          cb()
        },
        (cb) => {
          instances[0].removeAt(9)
          cb()
        },
        (cb) => setTimeout(cb, A_BIT),
        (cb) => {
          expectConvergenceOnValue(instances, '|..|BCEF-')

          expect(changeEvents[0]).to.have.lengthOf(2)

          const ev1 = changeEvents[0][0]
          expect(ev1.type).to.equal('delete')
          expect(ev1.deleted).to.equal('--')
          expect(ev1.pos).to.equal(8)
          expect(ev1.length).to.equal(2)

          const ev2 = changeEvents[0][1]
          expect(ev2.type).to.equal('insert')
          expect(ev2.atom).to.equal('-')
          expect(ev2.pos).to.equal(8)

          changeEvents = [[], []]
          cb()
        },
        (cb) => {
          instances[0].insertAt(0, '')
          cb()
        },
        (cb) => setTimeout(cb, A_BIT),
        (cb) => {
          expectConvergenceOnValue(instances, '|..|BCEF-')
          expect(changeEvents[0]).to.have.lengthOf(1)

          changeEvents = [[], []]
          cb()
        },
        (cb) => {
          instances[0].removeAt(0, 9)
          cb()
        },
        (cb) => setTimeout(cb, A_BIT),
        (cb) => {
          expectConvergenceOnValue(instances, '')
          expect(changeEvents[0]).to.have.lengthOf(7)
          let totalLength = 0

          changeEvents[0].forEach((change) => {
            expect(change.type).to.equal('delete')
            expect(change.pos).to.equal(0)
            expect(change.length).to.equal(change.deleted.length)
            totalLength += change.length
          })

          expect(totalLength).to.equal(9)

          changeEvents = [[], []]
          cb()
        },
        (cb) => {
          instances[0].insertAt(0, 'ABCDE')
            .then(() => instances[0].insertAt(5, 'FGHI'))
            .then(() => instances[0].push('12345678'))
            .then(() => instances[0].removeAt(8, 2))
            .then(() => cb())
        },
        (cb) => setTimeout(cb, A_BIT),
        (cb) => {
          expectConvergenceOnValue(instances, 'ABCDEFGH2345678')

          changeEvents = [[], []]
          cb()
        }
      ], done)
    })
  })
})

function expectConvergenceOnValue (instances, expectedValue) {
  let value
  instances.map((i) => i.value()).forEach((_value) => {
    if (!value) {
      value = _value
    } else {
      expect(_value).to.deep.equal(value)
    }
  })
  expect(value).to.deep.equal(expectedValue)
}

// process.on('unhandledRejection', (rej) => console.log(rej))

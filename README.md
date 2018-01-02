# peer-crdt

An extensible collection of operation-based CRDTs that are meant to work over a p2p network.


## `CRDT.defaults(options)`

Returns a CRDT collection that has these defaults for the `crdt.create()` options.

## `CRDT.create(type, id[, options])`

* `type`: string representing the CRDT type
* `id`: string representing the identifier of this CRDT. This ID will be passed down into the `Log` constructor, identifying this CRDT to all peers.
* `options`: optional options. See [options](#options).

Returns an new instance of the CRDT type.

## `crdt.on('change', () => {})`

Emitted when the CRDT value has changed.

## `crdt.value()`

Returns the latest computed CRDT value.

## Other `crdt` methods

Different CRDT types can define different methods for manipulating the CRDT.

For instance, a G-Counter CRDT can define an `increment` method.

# Composing

Allows the user to define high-level schemas, composing these low and high-level CRDTs into their own (observable) high-level structure classes.

## CRDT.compose(schema)

Composes a new CRDT based on a schema.

Returns a constructor function for this composed CRDT.

```js
const MyCRDT = CRDT.compose(schema)
const myCrdtInstance = MyCRDT(id)
```

* `schema`: an object defining a schema. Example:

```js
const schema = {
  a: 'g-set',
  b: 'lww-set'
}
```

(Internally, the IDs of the sub-CRDTs will be composed by appending the key to the CRDT ID. Ex: 'id-of-my-crdt/a')

Instead of a key-value map, you can create a schema based on an array. The keys for these values will be the array indexes. Example:


```js
const schema = [
  'g-set',
  'lww-set'
]
```

Any change in a nested object will trigger a `change` event in the container CRDT.

You can then get the current value by doing:

```
const value = myCrdtInstance.value()
```

Full example:

```js
const schema = {
  a: 'g-set',
  b: 'lww-set'
}
const MyCRDT = CRDT.compose(schema)
const myCrdtInstance = MyCRDT(id)

myCrdtInstance.on('deep change', () => {
  console.log('new value:', myCrdtInstance.value())
})
```

# Dynamic composition

You can use a CRDT as a value of another CRDT. For that, you should use `crdt.createForEmbed(type)` like this:

```js
const array = myCRDT.create('rga', 'embedding-test', options)

const counter = array.createForEmbed('g-counter')
array.push(counter)

array.once('change', (event) => {
  console.log(array.value()) // [0]

  array.on('deep change', () => {
    console.log(array.value()) // [1]
  })

  event.value.increment()
})
```

## Options

Here are the options for the `CRDT.create` and composed CRDT constructor are:

* `network`: a network plugin constructor. Should be a function with the following signature: `function (id, log, onRemoteHead)` and return an instance of [`Network`](#network)
* `store`: a constructor function with thw following signature: `function (id)`, which returns an implementation of the `Store` interface
* `authenticate`: a function that's used to generate the authentication data for a certain log entry. It will be called with the log entry (Object) and an array of parent entry ids (string), like this:

```js
async function authenticate (entry, parents) {
  return await authenticateSomehow(entry, parents)
}
```


# Built-in types

All the types in this package are operation-based CRDTs.

The following types are built-in:

## Counters

| Name | Identifier | Mutators | Value Type |
|------|------------|----------|------------|
| Increment-only Counter | `g-counter` | `.increment()` | int |
| PN-Counter | `pn-counter` |   `.increment()`,`.decrement()` | int |

## Sets

| Name | Identifier | Mutators | Value Type |
|------|------------|----------|------------|
| Grow-Only Set | `g-set` | `.add(element)` | Set |
| Two-Phase Set | `2p-set` |   `.add(element)`, `.remove(element)` | Set |
| Last-Write-Wins Set | `lww-set` | `.add(element)`, `.remove(element)` | Set |
| Observerd-Remove Set | `or-set` | `.add(element)`, `.remove(element)` | Set |

## Arrays

| Name | Identifier | Mutators | Value Type |
|------|------------|----------|------------|
| Replicable Growable Array | `rga` | `.push(element)`, `.insertAt(pos, element)`, `.removeAt(pos)`, `.set(pos, element)` | Array |
| TreeDoc | `treedoc` |  `.push(element)`, `.insertAt(pos, element)`, `.removeAt(pos)`, `.set(pos, element)`  | Array |

## Registers

| Name | Identifier | Mutators | Value Type |
|------|------------|----------|------------|
| Last-Write-Wins Register | `lww-register` |  `.set(key, value)`  | Map |
| Multi-Value Register | `mv-register` |  `.set(key, value)`  | Map (maps a key to an array of concurrent values) |

(TreeDoc is explained in [this document](https://hal.inria.fr/inria-00445975/document))

(For the other types, a detailed explanation is in [this document](http://hal.upmc.fr/inria-00555588/document).)


# Extending types

This package allows you to define new CRDT types.

## `CRDT.define(name, definition)`

Defines a new CRDT type with a given name and definition.

The definition is an object with the following attributes:

* `first`: a function that returns the initial value
* `reduce`: a function that accepts a message and the previous value and returns the new value
* `mutators`: an object containing named mutator functions, which should return the generated message for each mutation

Example of a G-Counter:

```js
{
  first: () => 0,
  reduce: (message, previous) => message + previous,
  mutators: {
    increment: () => 1
  }
}
```

## Interfaces

### Store

A store instance should expose the following methods:

* `async empty ()`: resovles to a boolean indicating if this store has no entries
* `async put (entry)`: puts an arbitrary JS object and resolves to a unique identifier for that object. The same object should generate the exact same id.
* `async get (id)`: gets an object from the store. Resolves to `undefined` if entry couldn't be found.
* `async setHead(id)`: stores the current head (string).
* `async getHead()`: retrieves the current head.

### Network

A network constructor should return a network instance and have the following signature:

```js
function createNetwork(id, log, onRemoteHead) {
  return new SomeKindOfNetwork()
}
```

`onRemoteHead` is a function that should be called once a remote head is detected. It should be called with one argument: the remote head id.

A network instance should expose the following interface:

* `async start()`: starts the network
* `async stop()`: stops the network
* `async get(id)`: tries retrieveing a specific entry from the network
* `setHead(headId)`: sets the current log head


# Internals

[docs/INTERNAL.md](docs/INTERNAL.md)

# License

MIT
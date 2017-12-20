# peer-crdt

An extensible collection of CRDTs that are meant to work over a p2p network.


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
  a: 'G-Set',
  b: 'LWW-Set'
}
```

(Internally, the IDs of the sub-CRDTs will be composed by appending the key to the CRDT ID. Ex: 'id-of-my-crdt/a')

Instead of a key-value map, you can create a schema based on an array. The keys for these values will be the array indexes. Example:


```js
const schema = [
  'G-Set',
  'LWW-Set'
]
```

You can then compose these at will, like, for instance:

```js
const myOrSet = CRDT.create('ORSet', id)
myCrdtInstance.a.add(myOrSet)
```

Any change in a nested object will trigger a `change` event in the container CRDT.

## Options

Here are the options for the `CRDT.create` and composed CRDT constructor are:

* `network`: a network plugin constructor. Should be a function with the following signature: `function (log)` and return an instance of [`Network`](#network)
* `store`: a constructor function with thw following signature: `function (id)`, which returns an implementation of the `Store` interface


## Types

### Store

A store instance should expose the following methods:

* `async put (entry)`: puts an arbitrary JS object and resolves to a unique identifier for that object. The same object should generate the exact same id.
* `async get (id)`: gets an object from the store.
* `async setHead(id)`: stores the current head (string).
* `async getHead()`: retrieves the current head.

### Network

PENDING: DEFINE NETWORK INTERFACE

# Extending

Allows you to define new CRDT types.

## `CRDT.define(name, definition)`

Defines a new CRDT type with a given name and definition.

The definition is an array with the following positions:

* 0: a function which returns the initial value
* 1: a function that accepts a message and the previous value and returns the new value
* 2: an object containing named mutator functions, which should return the generated message for each mutation

Example of a G-Counter:

```js
[
  () => 0, // initial value
  (message, previousValue) => message + previousValue, // process message
  {
    // mutator functions, which generate messages:
    increment: () => 1
  }
]
```


# License

MIT
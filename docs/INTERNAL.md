# Internals

* 1: __Log__: mergeable log structure.
  * Provides an asynchronous interface for a log immutable structure (maps to a DAG)
  * enables __pluggable store__, which implements persistence operations
  * enables pluggable connector
* 2: __CRDT__
  * defines a basic set of CRDT types
  * each __CRDT type__ provides a log merge function
  * __does not store operations or values or in memory__: uses the log interface for that
  * exposes a __computed view__ of the CRDT to the upper layer
  * exposes a series of high-level CRDTs (with known consistency characteristics)
* 3: __Composer__
  * Allows the user to define high-level schemas, composing these low and high-level CRDTs into their own (observable) high-level structure classes

# API

# Log

A log is an append-only structure. Consists of entries. Each log entry is immutable. The only way you can change the log is to append a new entry. A new entry points to the previous log head and creates a new log head.

A merge entry can be created given more than one log entry. This allows to converged logs that have diverged.

Each log entry has an entryID, which is a hash of the content and links of the node. (Since each node has links to the parent node(s), it also makes it easy to prove, by traversal, that a given node is an ancestor of this other given node).

## `Log(id, store, authenticateFn)`

Returns a new log.

* `id` is a string uniquely identifying this log. If synchronizing between nodes, this id will be used to identify log replicas.
* `store` is an instance of [Store](#store).
* `authenticateFn` is a function that authenticates each log entry has the following signature: `async function (value, parents)`.

## `log.since([lastKnownEntryId [, including]])`

Returns a pull-stream that emits log entries that happened after the known entry id.

If no entryId is provided, it emits entries since the beginning of time.

Note that this also emits `merge` log entries and the ancestors that are not a child of the given entryId (if any was given).

If `including` is true, the stream also includes the entry for `lastKnownEntryId`.

## `log.all()`

Returns a pull-stream containing all the logs. Alias for `log.since()`.

## `async log.append(value[, author [, parentEntryIds(Array<String>)]])`

Appends an entry to the log. Returns a log entry Id.

* `entry`: an arbitrary object. Must be JSON-serializable.
* `parentIds`: can either be:
  * an array of entryIds (strings)
  * a single entryId (string)
  *  `undefined`. In this case the latest head entry Id is assumed to be the parent.

## `log.on('new head', (logEntryId) => {})`

Event emitted when a new log head is created.

## `log.follow([since])`

Returns a pull stream that streams all the logs since `since` (or since ever if `since` is not defined), and keeps emitting values every time there is an update.

You can stop it if you want:

```js
const s = log.follow()

pull(
  s,
  pull.map((entry) => {
    console.log(entry)
    return entry
  }),
  pull.onEnd((err) => {
    console.log('ended', err)
  })
)

setTimeout(() => s.end(), 10000)
```

## Types

### Log Entry

A log entry (as emitted in the log streams) are objects with these attributes:

* `id`: the id of the entry (string)
* `value`: the value, arbitrary
* `parents`: an array containing the parent ids for this entry
* `auth`: the authentication data


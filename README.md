# PG PubSub

A Publish/Subscribe implementation on top of [PostgreSQL NOTIFY/LISTEN](https://www.postgresql.org/docs/current/sql-notify.html)

[![npm version](https://img.shields.io/npm/v/pg-pubsub.svg?style=flat)](https://www.npmjs.com/package/pg-pubsub)
[![npm downloads](https://img.shields.io/npm/dm/pg-pubsub.svg?style=flat)](https://www.npmjs.com/package/pg-pubsub)
[![Module type: CJS](https://img.shields.io/badge/module%20type-cjs-brightgreen)](https://github.com/voxpelli/badges-cjs-esm)
[![Types in JS](https://img.shields.io/badge/types_in_js-yes-brightgreen)](https://github.com/voxpelli/types-in-js)
[![js-semistandard-style](https://img.shields.io/badge/code%20style-semistandard-brightgreen.svg)](https://github.com/voxpelli/eslint-config)
[![Follow @voxpelli@mastodon.social](https://img.shields.io/mastodon/follow/109247025527949675?domain=https%3A%2F%2Fmastodon.social&style=social)](https://mastodon.social/@voxpelli)

## Installation

```bash
npm install pg-pubsub --save
```

## Requirements

* Postgres >= 9.4

## Usage

```js
const PGPubsub = require('pg-pubsub');
const pubsubInstance = new PGPubsub(uri[, options]);
```

### Options

```js
{
  [log]: Function // default: silent when NODE_ENV=production, otherwise defaults to console.log(...)
}
```

### Methods

* **addChannel(channelName[, eventListener])** – starts listening on a channel and optionally adds an event listener for that event. As `PGPubsub` inherits from `EventEmitter` one can also add it oneself. Returns a `Promise` that resolves when the listening has started.
* **removeChannel(channelName[, eventListener])** – either removes all event listeners and stops listeneing on the channel or removes the specified event listener and stops listening on the channel if that was the last listener attached.
* **publish(channelName, data)** – publishes the specified data JSON-encoded to the specified channel. It may be better to do this by sending the `NOTIFY channelName, '{"hello":"world"}'` query yourself using your ordinary Postgres pool, rather than relying on the single connection of this module. Returns a `Promise` that will become rejected or resolved depending on the success of the Postgres call.
* **close(): Promise<void>** – closes down the database connection and removes all listeners. Useful for graceful shutdowns.
* All [EventEmitter methods](http://nodejs.org/api/events.html#events_class_events_eventemitter) are inherited from `EventEmitter`

### Examples

#### Simple

```javascript
const pubsubInstance = new PGPubsub('postgres://username@localhost/database');

await pubsubInstance.addChannel('channelName', function (channelPayload) {
  // Process the payload – if it was JSON that JSON has been parsed into an object for you
});

await pubsubInstance.publish('channelName', { hello: "world" });
```

The above sends `NOTIFY channelName, '{"hello":"world"}'` to PostgreSQL, which will trigger the above listener with the parsed JSON in `channelPayload`.

#### Advanced

```javascript
const pubsubInstance = new PGPubsub('postgres://username@localhost/database');

await pubsubInstance.addChannel('channelName');

// pubsubInstance is a full EventEmitter object that sends events on channel names
pubsubInstance.once('channelName', channelPayload => {
  // Process the payload
});
```

## Description

Creating a `PGPubsub` instance will not do much up front. It will prepare itself to start a Postgres connection once the first channel is added and then it will keep a connection open until its shut down, reconnecting it if it gets lost, so that it can constantly listen for new notifications.

## Lint / Test

- setup a postgres database to run the integration tests
  - the easist way to do this is via docker, `docker run -it -p 5432:5432 -e POSTGRES_DB=pgpubsub_test postgres`
- `npm test`

For an all-in-one command, try:
```sh
# fire up a new DB container, run tests against it, and clean it up!
docker rm -f pgpubsub_test || true && \
docker run -itd -p 5432:5432 -e POSTGRES_DB=pgpubsub_test --name pgpubsub_test postgres && \
npm test && \
docker rm -f pgpubsub_test
```


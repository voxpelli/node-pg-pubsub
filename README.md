# PG PubSub

A Publish/Subscribe implementation on top of [PostgreSQL NOTIFY/LISTEN](http://www.postgresql.org/docs/9.3/static/sql-notify.html)

[![Build Status](https://travis-ci.org/voxpelli/node-pg-pubsub.svg?branch=master)](https://travis-ci.org/voxpelli/node-pg-pubsub)
[![Coverage Status](https://coveralls.io/repos/voxpelli/node-pg-pubsub/badge.svg)](https://coveralls.io/r/voxpelli/node-pg-pubsub)
[![dependencies Status](https://david-dm.org/voxpelli/node-pg-pubsub/status.svg)](https://david-dm.org/voxpelli/node-pg-pubsub)
[![Known Vulnerabilities](https://snyk.io/test/github/voxpelli/node-pg-pubsub/badge.svg?targetFile=package.json)](https://snyk.io/test/github/voxpelli/node-pg-pubsub?targetFile=package.json)
[![js-semistandard-style](https://img.shields.io/badge/code%20style-semistandard-brightgreen.svg?style=flat)](https://github.com/Flet/semistandard)

## Installation

```bash
npm install pg-pubsub --save
```

## Requirements

Node.js >= 10.x

## Usage

```js
var PGPubsub = require('pg-pubsub');
var pubsubInstance = new PGPubsub(uri[, options]);
```

### Options

```js
{
  [log]: Function // default: silent when NODE_ENV=production, otherwise defaults to console.log(...)
}
```

### Methods

* **addChannel(channelName[, eventListener])** – starts listening on a channel and optionally adds an event listener for that event. As `PGPubsub` inherits from `EventEmitter` one also add it oneself.
* **removeChannel(channelName[, eventListener])** – either removes all event listeners and stops listeneing on the channel or removes the specified event listener and stops listening on the channel if that was the last listener attached.
* **publish(channelName, data)** – publishes the specified data JSON-encoded to the specified channel. It may be better to do this by sending the `NOTIFY channelName, '{"hello":"world"}'` query yourself using your ordinary Postgres pool, rather than relying on the single connection of this module. Returns a Promise that will become rejected or resolved depending on the success of the Postgres call.
* **close(): Promise<void>** – closes down the database connection and removes all listeners. Useful for graceful shutdowns.
* All [EventEmitter methods](http://nodejs.org/api/events.html#events_class_events_eventemitter) are inherited from `EventEmitter`

### Examples

#### Simple

```javascript
var pubsubInstance = new PGPubsub('postgres://username@localhost/database');

pubsubInstance.addChannel('channelName', function (channelPayload) {
  // Process the payload – if it was JSON that JSON has been parsed into an object for you
});

pubsubInstance.publish('channelName', { hello: "world" });
```

The above sends `NOTIFY channelName, '{"hello":"world"}'` to PostgreSQL, which will trigger the above listener with the parsed JSON in `channelPayload`.

#### Advanced

```javascript
var pubsubInstance = new PGPubsub('postgres://username@localhost/database');

pubsubInstance.addChannel('channelName');

// pubsubInstance is a full EventEmitter object that sends events on channel names
pubsubInstance.once('channelName', function (channelPayload) {
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


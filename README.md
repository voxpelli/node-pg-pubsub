# PG PubSub

A Publish/Subscribe implementation on top of [PostgreSQL NOTIFY/LISTEN](http://www.postgresql.org/docs/9.3/static/sql-notify.html)


[![Build Status](https://travis-ci.org/voxpelli/node-pg-pubsub.svg?branch=master)](https://travis-ci.org/voxpelli/node-pg-pubsub)
[![Coverage Status](https://coveralls.io/repos/voxpelli/node-pg-pubsub/badge.svg)](https://coveralls.io/r/voxpelli/node-pg-pubsub)
[![Dependency Status](https://gemnasium.com/voxpelli/node-pg-pubsub.svg)](https://gemnasium.com/voxpelli/node-pg-pubsub)

## Installation

```bash
npm install pg-pubsub --save
```

## Requirements

The `pg` npm package has to be installed. Also – at least node 0.12 or iojs has to be used.

## Usage

Simple:

```javascript
var pubsubInstance = new PGPubsub('postgres://username@localhost/database');

pubsubInstance.addChannel('channelName', function (channelPayload) {
  // Process the payload – if it was JSON that JSON has been parsed into an object for you
});

pubsubInstance.publish('channelName', { hello: "world" });
```

The above sends `NOTIFY channelName, '{"hello":"world"}'` to PostgreSQL, which will trigger the above listener with the parsed JSON in `channelPayload`.

More advanced variant:

```javascript
var pubsubInstance = new PGPubsub('postgres://username@localhost/database');

pubsubInstance.addChannel('channelName');

// pubsubInstance is a full EventEmitter object that sends events on channel names
pubsubInstance.once('channelName', function (channelPayload) {
  // Process the payload
});
```

## Methods

* **addChannel(channelName[, eventListener])** – starts listening on a channel and optionally adds an event listener for that event. As `PGPubsub` inherits from `EventEmitter` one also add it oneself.
* **removeChannel(channelName[, eventListener])** – either removes all event listeners and stops listeneing on the channel or removes the specified event listener and stops listening on the channel if that was the last listener attached.
* **publish(channelName, data)** – publishes the specified data JSON-encoded to the specified channel. It may be better to do this by sending the `NOTIFY channelName, '{"hello":"world"}'` query yourself using your ordinary Postgres pool, rather than relying on the single connection of this module. Returns a Promise that will become rejected or resolved depending on the success of the Postgres call.
* **close** – closes down the database connection and removes all listeners. Useful for graceful shutdowns.
* All [EventEmitter methods](http://nodejs.org/api/events.html#events_class_events_eventemitter) are inherited from `EventEmitter`

## Description

Creating a `PGPubsub` instance will not do much up front. It will prepare itself to start a Postgres connection once the first channel is added and then it will keep a connection open until its shut down, reconnecting it if it gets lost, so that it can constantly listen for new notifications.

## Lint / Test

`npm test` or to watch, install `grunt-cli` then do `grunt watch`

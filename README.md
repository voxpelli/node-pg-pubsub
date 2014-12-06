# PG PubSub

A Publish/Subscribe implementation on top of [PostgreSQL NOTIFY/LISTEN](http://www.postgresql.org/docs/9.3/static/sql-notify.html)

## Installation

```bash
npm install pg-pubsub --save
```

## Requirements

Either the `pg` or the `pg.js` npm package has to be installed.

## Usage

Simple:

```javascript
var pubsubInstance = new PGPubsub('postgres://username@localhost/tablename');

pubsubInstance.addChannel('channelName', function (channelPayload) {
  // Process the payload – if it was JSON that JSON has been parsed into an object for you
});

```

Sending `NOTIFY channelName, '{"hello":"world"}'` to PostgreSQL will trigger the above listener with the parsed JSON in `channelPayload` .

More advanced variant:

```javascript
var pubsubInstance = new PGPubsub('postgres://username@localhost/tablename');

pubsubInstance.addChannel('channelName');

// pubsubInstance is a full EventEmitter object that sends events on channel names
pubsubInstance.once('channelName', function (channelPayload) {
  // Process the payload
});
```

## Methods

* **addChannel(channelName[, eventListener])** – starts listening on a channel and optionally adds an event listener for that event. As `PGPubsub` inherits from `EventEmitter` one also add it oneself.
* **removeChannel(channelName[, eventListener])** – either removes all event listeners and stops listeneing on the channel or removes the specified event listener and stops listening on the channel if that was the last listener attached.
* **close** – closes down the database connection and removes all listeners. Useful for graceful shutdowns.
* All [EventEmitter methods](http://nodejs.org/api/events.html#events_class_events_eventemitter) are inherited from `EventEmitter`

## Description

Creating a `PGPubsub` instance will not do much up front. It will prepare itself to start a Postgres connection once the first channel is added and then it will keep a connection open until its shut down, reconnecting it if it gets lost, so that it can constantly listen for new notifications.

## Lint / Test

`npm test` or to watch, install `grunt-cli` then do `grunt watch`

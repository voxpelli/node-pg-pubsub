# PG PubSub

A Publish/Subscribe implementation on top of [PostgreSQL NOTIFY/LISTEN](http://www.postgresql.org/docs/9.3/static/sql-notify.html)

## Installation

```bash
npm install pg-pubsub --save
```

## Usage

Simple:

```javascript
var pubsubInstance = new PGPubsub('postgres://username@localhost/tablename');

pubsubInstance.addChannel('channelName', function (channelPayload) {
  // Process the payload – if it was JSON that JSON has been parsed into an object for you
});
```

Advanced:

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
* **close** – closes down the database connection and removes all listeners
* All [EventEmitter methods](http://nodejs.org/api/events.html#events_class_events_eventemitter) are inherited from `EventEmitter`

## Lint / Test

`npm test` or to watch, install `grunt-cli` then do `grunt watch`

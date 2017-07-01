'use strict';

const pgFormat = require('pg-format');

const EventEmitter = require('events').EventEmitter;
const Retry = require('promised-retry');
const util = require('util');
const VError = require('verror');

const pg = require('pg');

const queryPromise = (db, query) => {
  return new Promise((resolve, reject) => {
    db.query(query, err => { err ? reject(err) : resolve(); });
  });
};

const PGPubsub = function (conString, options) {
  EventEmitter.call(this);

  this.setMaxListeners(0);

  conString = conString || process.env.DATABASE_URL;

  const conObject = typeof conString === 'object'
    ? conString
    : { connectionString: conString };

  this.conObject = conObject;
  this.channels = [];
  this.conFails = 0;

  options = options || {};

  this.retry = new Retry({
    name: 'pubsub',
    try: () => {
      const db = new pg.Client(this.conObject);
      db.on('error', () => {
        this.retry.reset();
        if (this.channels.length) {
          this.retry.try();
        }
      });
      return new Promise((resolve, reject) => {
        db.connect(err => {
          if (err) {
            reject(err);
          } else {
            resolve(db);
          }
        });
      });
    },
    success: db => {
      db.on('notification', msg => this._processNotification(msg));

      Promise.all(this.channels.map(channel => queryPromise(db, 'LISTEN "' + channel + '"')))
        .catch(err => { this.emit('error', new VError(err, 'Failed to set up channels on new connection')); });
    },
    end: db => {
      if (db) { db.end(); }
    },
    retryLimit: options.retryLimit,
    log: options.log || console.log.bind(console)
  });
};

util.inherits(PGPubsub, EventEmitter);

PGPubsub.prototype._getDB = function (noNewConnections) {
  return this.retry.try(!noNewConnections)
    .catch(err => Promise.reject(new VError(err, 'Failed to establish database connection')));
};

PGPubsub.prototype._processNotification = function (msg) {
  let payload = msg.payload;

  try {
    payload = JSON.parse(payload);
  } catch (err) {}

  this.emit(msg.channel, payload);
};

PGPubsub.prototype.addChannel = function (channel, callback) {
  if (this.channels.indexOf(channel) === -1) {
    this.channels.push(channel);

    this._getDB()
      .then(db => queryPromise(db, 'LISTEN "' + channel + '"'))
      .catch(err => { this.emit('error', new VError(err, 'Failed to listen to channel')); });
  }

  if (callback) {
    this.on(channel, callback);
  }

  return this;
};

PGPubsub.prototype.removeChannel = function (channel, callback) {
  const pos = this.channels.indexOf(channel);

  if (pos === -1) {
    return;
  }

  if (callback) {
    this.removeListener(channel, callback);
  } else {
    this.removeAllListeners(channel);
  }

  if (this.listeners(channel).length === 0) {
    this.channels.splice(pos, 1);
    this._getDB(true)
      .then(db => queryPromise(db, 'UNLISTEN "' + channel + '"'))
      .catch(err => { this.emit('error', new VError(err, 'Failed to stop listening to channel')); });
  }

  return this;
};

PGPubsub.prototype.publish = function (channel, data) {
  return this._getDB()
    .then(db => queryPromise(db, 'NOTIFY "' + channel + '", ' + pgFormat.literal(JSON.stringify(data))))
    .catch(err => Promise.reject(new VError(err, 'Failed to publish to channel')));
};

PGPubsub.prototype.close = function () {
  this.retry.end();
  this.removeAllListeners();
  this.channels = [];
};

module.exports = PGPubsub;

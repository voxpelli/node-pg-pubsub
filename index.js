'use strict';

const pgFormat = require('pg-format');

const EventEmitter = require('events').EventEmitter;
const Retry = require('promised-retry');
const util = require('util');

const pg = require('pg');

const PGPubsub = function (conString, options) {
  EventEmitter.call(this);

  this.setMaxListeners(0);

  this.conString = conString;
  this.channels = [];
  this.conFails = 0;

  options = options || {};

  this.retry = new Retry({
    name: 'pubsub',
    try: () => {
      const db = new pg.Client(this.conString);
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

      this.channels.forEach(channel => {
        db.query('LISTEN "' + channel + '"');
      });
    },
    end: db => {
      db.end();
    },
    log: options.log || console.log.bind(console)
  });
};

util.inherits(PGPubsub, EventEmitter);

PGPubsub.prototype._getDB = function (callback, noNewConnections) {
  return this.retry.try(!noNewConnections).then(callback);
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

    this._getDB(db => {
      db.query('LISTEN "' + channel + '"');
    });
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
    this._getDB(db => {
      db.query('UNLISTEN "' + channel + '"');
    }, true);
  }

  return this;
};

PGPubsub.prototype.publish = function (channel, data) {
  return this._getDB(db => new Promise((resolve, reject) => {
    db.query(
      'NOTIFY "' + channel + '", ' + pgFormat.literal(JSON.stringify(data)),
      err => { err ? reject(err) : resolve(); }
    );
  }));
};

PGPubsub.prototype.close = function () {
  this.retry.end();
  this.removeAllListeners();
  this.channels = [];
};

module.exports = PGPubsub;

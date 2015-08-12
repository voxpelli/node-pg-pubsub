/*jslint node: true */

'use strict';

var _ = require('lodash');

var EventEmitter = require('events').EventEmitter;
var Retry = require('promised-retry');
var util = require('util');

var pg = require('pg');

var PGPubsub = function (conString, options) {
  EventEmitter.call(this);
  var self = this;

  this.setMaxListeners(0);

  this.conString = conString;
  this.channels = [];
  this.conFails = 0;

  options = options || {};

  this.retry = new Retry({
    name: 'pubsub',
    try: function () {
      var db = new pg.Client(self.conString);
      db.on('error', function () {
        self.retry.reset();
        if (self.channels.length) {
          self.retry.try();
        }
      });
      return new Promise(function (resolve, reject) {
        db.connect(function (err) {
          if (err) {
            reject(err);
          } else {
            resolve(db);
          }
        });
      });
    },
    success: function (db) {
      db.on('notification', self._processNotification.bind(self));

      self.channels.forEach(function (channel) {
        db.query('LISTEN "' + channel + '"');
      });
    },
    end: function (db) {
      db.end();
    },
    log: options.log || console.log.bind(console),
  });
};

util.inherits(PGPubsub, EventEmitter);

PGPubsub.prototype._getDB = function (createNew, callback) {
  if (_.isFunction(createNew)) {
    callback = createNew;
    createNew = undefined;
  }
  return this.retry.try(createNew).then(callback);
};

PGPubsub.prototype._processNotification = function (msg) {
  var payload = msg.payload;

  try {
    payload = JSON.parse(payload);
  } catch (err) {}

  this.emit(msg.channel, payload);
};

PGPubsub.prototype.addChannel = function (channel, callback) {
  if (this.channels.indexOf(channel) === -1) {
    this.channels.push(channel);

    this._getDB(function (db) {
      db.query('LISTEN "' + channel + '"');
    });
  }

  if (callback) {
    this.on(channel, callback);
  }

  return this;
};

PGPubsub.prototype.removeChannel = function (channel, callback) {
  var pos = this.channels.indexOf(channel);

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
    this._getDB(false, function (db) {
      db.query('UNLISTEN "' + channel + '"');
    });
  }

  return this;
};

PGPubsub.prototype.publish = function (channel, data) {
  this._getDB(function (db) {
    db.query('NOTIFY "' + channel +  '", \'' + JSON.stringify(data) + '\'');
  });
};

PGPubsub.prototype.close = function () {
  this.retry.end();
  this.removeAllListeners();
  this.channels = [];
};

module.exports = PGPubsub;

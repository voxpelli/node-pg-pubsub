// @ts-check
/// <reference types="node" />
/// <reference types="pg" />

'use strict';

/** @typedef {import('pg').ClientConfig} PgClientConfig */
/** @typedef {import('pg').Client} PgClient */
/** @typedef {import('pg').Notification} PgNotification */

const pgFormat = require('pg-format');

const { EventEmitter } = require('events');
const Retry = require('promised-retry');
const VError = require('verror');

const pg = require('pg');

/**
 * @param {PgClient} db
 * @param {string} query
 */
const queryPromise = (db, query) => {
  return new Promise((resolve, reject) => {
    db.query(query, err => { err ? reject(err) : resolve(); });
  });
};

/** @typedef {(payload: any) => void} PGPubsubCallback */

class PGPubsub extends EventEmitter {
  /**
   * @param {string | PgClientConfig} conString
   * @param {object} [options]
   * @param {(...params: any[]) => void} [options.log]
   * @param {number} [options.retryLimit]
   */
  constructor (conString, { log, retryLimit } = {}) {
    super();

    this.setMaxListeners(0);

    conString = conString || process.env.DATABASE_URL;

    const conObject = typeof conString === 'object'
      ? conString
      : { connectionString: conString };

    this.conObject = conObject;
    this.channels = [];
    this.conFails = 0;

    log = log || (process.env.NODE_ENV === 'production' ? () => {} : console.log.bind(console));

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
      success:
        /** @param {PgClient} db */
        db => {
          db.on('notification', msg => this._processNotification(msg));

          Promise.all(this.channels.map(channel => queryPromise(db, 'LISTEN "' + channel + '"')))
            .catch(err => { this.emit('error', new VError(err, 'Failed to set up channels on new connection')); });
        },
      end:
        /** @param {PgClient} [db] */
        db => db ? db.end() : undefined,
      retryLimit,
      log
    });
  }

  /**
   * @param {boolean} [noNewConnections]
   * @returns {Promise<PgClient>}
   */
  _getDB (noNewConnections) {
    return this.retry.try(!noNewConnections)
      .catch(err => Promise.reject(new VError(err, 'Failed to establish database connection')));
  }

  /**
   * @param {PgNotification} msg
   * @returns {void}
   */
  _processNotification (msg) {
    let payload = msg.payload;

    try {
      payload = JSON.parse(payload);
    } catch (err) {}

    this.emit(msg.channel, payload);
  }

  /**
   * @param {string} channel
   * @param {PGPubsubCallback} callback
   * @returns {this}
   */
  addChannel (channel, callback) {
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
  }

  /**
   * @param {string} channel
   * @param {PGPubsubCallback} [callback]
   * @returns {this}
   */
  removeChannel (channel, callback) {
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
  }

  /**
   * @param {string} channel
   * @param {any} [data]
   * @returns {Promise<void>}
   */
  publish (channel, data) {
    const payload = data ? ', ' + pgFormat.literal(JSON.stringify(data)) : '';

    return this._getDB()
      .then(db => queryPromise(db, `NOTIFY "${channel}"${payload}`))
      .catch(err => Promise.reject(new VError(err, 'Failed to publish to channel')));
  }

  /**
   * @returns {Promise<void>}
   */
  close () {
    this.removeAllListeners();
    this.channels = [];
    return this.retry.end();
  }
}

module.exports = PGPubsub;

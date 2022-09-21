/* eslint-disable promise/prefer-await-to-then */
// @ts-check
/// <reference types="node" />
/// <reference types="pg" />

'use strict';

const EventEmitter = require('node:events');

const pgFormat = require('pg-format');
const { ErrorWithCause } = require('pony-cause');

const { pgClientRetry } = require('./lib/client');

// TODO: Move to an async generator approach rather than EventEmitter

/** @typedef {(payload: any) => void} PGPubsubCallback */

class PGPubsub extends EventEmitter {
  /** @type {string[]} */
  #channels = [];

  /** @type {import('promised-retry')} */
  #retry;

  /**
   * @param {string | import('pg').ClientConfig} [conString]
   * @param {{ log?: typeof console.log, retryLimit?: number }} options
   */
  // eslint-disable-next-line n/no-process-env
  constructor (conString = process.env['DATABASE_URL'], { log, retryLimit } = {}) {
    super();

    this.setMaxListeners(0);

    this.#retry = pgClientRetry({
      clientOptions: typeof conString === 'object' ? conString : { connectionString: conString },
      retryLimit,
      log,
      shouldReconnect: () => this.#channels.length !== 0,
      successCallback: client => {
        client.on('notification', msg => this.#processNotification(msg));

        Promise.all(this.#channels.map(channel => client.query('LISTEN "' + channel + '"')))
          .catch(/** @param {unknown} err */err => {
            this.emit(
              'error',
              new ErrorWithCause('Failed to set up channels on new connection', { cause: err })
            );
          });

        return client;
      },
    });
  }

  /**
   * @protected
   * @param {boolean} [noNewConnections]
   * @returns {Promise<import('pg').Client>}
   */
  async _getDB (noNewConnections) {
    return this.#retry.try(!noNewConnections)
      .catch(/** @param {unknown} err */err => {
        throw new ErrorWithCause('Failed to establish database connection', { cause: err });
      });
  }

  /**
   * @param {import('pg').Notification} msg
   * @returns {void}
   */
  #processNotification (msg) {
    let payload = msg.payload || '';

    // If the payload is valid JSON, then replace it with such
    try { payload = JSON.parse(payload); } catch {}

    this.emit(msg.channel, payload);
  }

  /**
   * @param {string} channel
   * @param {PGPubsubCallback} [callback]
   * @returns {Promise<void>}
   */
  async addChannel (channel, callback) {
    if (!this.#channels.includes(channel)) {
      this.#channels.push(channel);

      // TODO: Can't this possibly result in both the try() method and this method adding a LISTEN for it?
      try {
        const db = await this._getDB();
        await db.query('LISTEN "' + channel + '"');
      } catch (err) {
        throw new ErrorWithCause('Failed to listen to channel', { cause: err });
      }
    }

    if (callback) {
      this.on(channel, callback);
    }
  }

  /**
   * @param {string} channel
   * @param {PGPubsubCallback} [callback]
   * @returns {this}
   */
  removeChannel (channel, callback) {
    const pos = this.#channels.indexOf(channel);

    if (pos === -1) {
      return this;
    }

    if (callback) {
      this.removeListener(channel, callback);
    } else {
      this.removeAllListeners(channel);
    }

    if (this.listeners(channel).length === 0) {
      this.#channels.splice(pos, 1);
      this._getDB(true)
        .then(db => db.query('UNLISTEN "' + channel + '"'))
        .catch(/** @param {unknown} err */err => {
          this.emit(
            'error',
            new ErrorWithCause('Failed to stop listening to channel', { cause: err })
          );
        });
    }

    return this;
  }

  /**
   * @param {string} channel
   * @param {any} [data]
   * @returns {Promise<void>}
   */
  async publish (channel, data) {
    const payload = data ? ', ' + pgFormat.literal(JSON.stringify(data)) : '';

    try {
      const db = await this._getDB();
      await db.query(`NOTIFY "${channel}"${payload}`);
    } catch (err) {
      throw new ErrorWithCause('Failed to publish to channel', { cause: err });
    }
  }

  /** @returns {Promise<void>} */
  async close () {
    this.removeAllListeners();
    this.#channels = [];
    return this.#retry.end();
  }

  reset () {
    return this.#retry.reset();
  }
}

module.exports = PGPubsub;

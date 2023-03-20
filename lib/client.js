// @ts-check
/// <reference types="node" />
/// <reference types="pg" />

'use strict';

const Retry = require('promised-retry');

const { Client } = require('pg');

/** @returns {typeof console.log} */
const getDefaultLog = () =>
  // eslint-disable-next-line n/no-process-env
  process.env['NODE_ENV'] === 'production'
    ? () => {}
    // eslint-disable-next-line no-console
    : console.log.bind(console);

/**
 * @typedef PgClientRetryOptions
 * @property {string|import('pg').ClientConfig} clientOptions
 * @property {(typeof console.log)|undefined} [log]
 * @property {number|undefined} [retryLimit]
 * @property {(client: import('pg').Client) => Promise<import('pg').Client>|import('pg').Client} [successCallback]
 * @property {() => boolean} [shouldReconnect]
 */

/**
 * @param {PgClientRetryOptions} options
 * @returns {import('promised-retry')}
 */
const pgClientRetry = (options) => {
  const {
    clientOptions,
    log = getDefaultLog(),
    retryLimit,
    shouldReconnect,
    successCallback,
  } = options;

  const retry = new Retry({
    // TODO: Improve types for this in promised-retry
    'try': async () => {
      const client = new Client(clientOptions);

      // TODO: Add client.on('end') ?
      // If the connection fail after we have established it, then we need to reset the state of our retry mechanism and restart from scratch.
      client.on('error', () => {
        retry.reset();
        if (shouldReconnect && shouldReconnect()) retry.try();
        client.end(err => {
          log('Received error when disconnecting from database in error callback: ' + (err && err.message));
        });
      });

      // Do the connect
      await client.connect();

      return client;
    },
    // TODO: Improve types for this in promised-retry, what should actually be returned?
    success:
      /** @param {import('pg').Client} client */
      async client => successCallback ? successCallback(client) : client,
    // TODO: Improve types for this in promised-retry
    end:
      /** @param {import('pg').Client} [client] */
      async client => client ? client.end() : undefined,
    name: 'pgClientRetry',
    retryLimit,
    log
  });

  return retry;
};

module.exports = {
  pgClientRetry
};

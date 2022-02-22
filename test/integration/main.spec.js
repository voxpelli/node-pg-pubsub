/* eslint-env mocha */
/* eslint-disable n/no-unpublished-require, no-unused-expressions */

// @ts-check
/// <reference types="node" />
/// <reference types="mocha" />
/// <reference types="chai" />
/// <reference types="chai-as-promised" />

'use strict';

const { connectionDetails } = require('../db-utils');

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);
chai.should();

// @ts-ignore
// eslint-disable-next-line no-console
process.on('unhandledRejection', err => { console.log('Unhandled Rejection:', err.stack); });

const PGPubsub = require('../../');

// eslint-disable-next-line n/no-process-env
const conStringInvalidUser = process.env.DATABASE_TEST_URL_INVALID_USER || 'postgres://invalidUsername@localhost/pgpubsub_test';
// eslint-disable-next-line n/no-process-env
const conStringInvalidPassword = process.env.DATABASE_TEST_URL_INVALID_PASSWORD || 'postgres://postgres:invalid@localhost/pgpubsub_test';

/**
 * @template T
 * @returns {[Promise<T>, (value?: T | PromiseLike<T>) => void, (err: Error) => void]}
 */
const resolveablePromise = () => {
  /** @type {(value?: T | PromiseLike<T>) => void} */
  let resolver;
  /** @type {(err: Error) => void} */
  let rejecter;

  const resolveable = new Promise((resolve, reject) => {
    resolver = resolve;
    rejecter = reject;
  });

  // @ts-ignore
  return [resolveable, resolver, rejecter];
};

describe('Pubsub', () => {
  /** @type {import('../../index')} */
  let pubsubInstance;
  /** @type {import('pg').Client} */
  let db;

  beforeEach(async () => {
    pubsubInstance = new PGPubsub(connectionDetails, {
      log: function (...params) {
        if (typeof arguments[0] !== 'string' || !arguments[0].startsWith('Success')) {
          // eslint-disable-next-line no-console
          console.log.call(this, ...params);
        }
      }
    });

    // @ts-ignore
    db = await pubsubInstance._getDB();
  });

  afterEach(() => pubsubInstance.close());

  describe('init', function () {
    this.timeout(2000);

    it('should handle errenous database user', async () => {
      pubsubInstance.close();
      pubsubInstance = new PGPubsub(conStringInvalidUser, {
        log: () => {},
        retryLimit: 1
      });
      // @ts-ignore
      return pubsubInstance._getDB()
        .should.be.rejectedWith(/Failed to establish database connection/);
    });

    // TODO: Fix, doesn't work on Travis right now
    it.skip('should handle errenous database password', async () => {
      pubsubInstance.close();
      pubsubInstance = new PGPubsub(conStringInvalidPassword, {
        log: () => {},
        retryLimit: 1
      });
      // @ts-ignore
      return pubsubInstance._getDB()
        .should.be.rejectedWith(/Failed to establish database connection/);
    });
  });

  describe('receive', function () {
    it('should receive a notification', async () => {
      const [result, resolve] = resolveablePromise();

      await pubsubInstance.addChannel('foobar', (channelPayload) => {
        channelPayload.should.deep.equal({ abc: 123 });
        resolve();
      });

      await db.query('NOTIFY foobar, \'{"abc":123}\'');

      return result;
    });

    it('should handle non-JSON notifications', async () => {
      const [result, resolve] = resolveablePromise();

      await pubsubInstance.addChannel('foobar', channelPayload => {
        channelPayload.should.equal('barfoo');
        resolve();
      });
      await db.query('NOTIFY foobar, \'barfoo\'');

      return result;
    });

    it('should only receive notifications from correct channel', async () => {
      const [result1, resolve1] = resolveablePromise();
      const [result2, resolve2] = resolveablePromise();

      await pubsubInstance.addChannel('foo', channelPayload => {
        channelPayload.should.deep.equal({ abc: 123 });
        resolve1();
      });

      await pubsubInstance.addChannel('bar', channelPayload => {
        channelPayload.should.deep.equal({ xyz: 789 });
        resolve2();
      });

      await Promise.all([
        db.query('NOTIFY def, \'{"ghi":456}\''),
        db.query('NOTIFY foo, \'{"abc":123}\''),
        db.query('NOTIFY bar, \'{"xyz":789}\''),
      ]);

      await Promise.all([
        result1,
        result2,
      ]);
    });

    it('should handle non-alphanumeric channel names', async () => {
      const [result, resolve] = resolveablePromise();

      await pubsubInstance.addChannel('97a38cd1-d332-4240-93e4-1ff436a7da2a', function (channelPayload) {
        channelPayload.should.deep.equal({ 'non-alpha': true });
        resolve();
      });

      await db.query('NOTIFY "97a38cd1-d332-4240-93e4-1ff436a7da2a", \'{"non-alpha":true}\'');

      return result;
    });

    it('should stop listening when channel is removed', async () => {
      const [result, resolve] = resolveablePromise();

      await pubsubInstance.addChannel('foo', function () {
        throw new Error('This channel should have been removed and should not receive any items');
      });

      await pubsubInstance.addChannel('foo', function () {
        throw new Error('This channel should have been removed and should not receive any items');
      });

      await pubsubInstance.addChannel('bar', function () {
        resolve();
      });

      pubsubInstance.removeChannel('foo');

      await db.query('NOTIFY foo, \'{"abc":123}\'');
      await db.query('NOTIFY bar, \'{"xyz":789}\'');

      return result;
    });

    it('should allow multiple listener for same channel', async () => {
      const [result, resolve] = resolveablePromise();

      let first = false;

      await pubsubInstance.addChannel('foobar', function () {
        first = true;
      });
      await pubsubInstance.addChannel('foobar', function () {
        first.should.be.ok;
        resolve();
      });

      await db.query('NOTIFY foobar, \'{"abc":123}\'');

      return result;
    });

    it('should be able to remove specific listener', async () => {
      const [result, resolve] = resolveablePromise();

      let second = false;

      // eslint-disable-next-line unicorn/consistent-function-scoping
      const listener = function () {
        throw new Error('This channel should have been removed and should not receive any items');
      };

      await pubsubInstance.addChannel('foobar', listener);

      await pubsubInstance.addChannel('foobar', function () {
        if (second) {
          resolve();
        } else {
          second = true;
        }
      });

      pubsubInstance.removeChannel('foobar', listener);

      await db.query('NOTIFY foobar, \'{"abc":123}\'');
      await db.query('NOTIFY foobar, \'{"abc":123}\'');

      return result;
    });

    it('should support EventEmitter methods for listening', async () => {
      const [result, resolve] = resolveablePromise();

      await pubsubInstance.addChannel('foobar');

      pubsubInstance.on('foobar', function () {
        resolve();
      });

      await db.query('NOTIFY foobar, \'{"abc":123}\'');

      return result;
    });

    it('should support recovery after reconnect', async () => {
      const [result, resolve] = resolveablePromise();

      await pubsubInstance.addChannel('foobar', function () {
        resolve();
      });

      setImmediate(() => {
        db.end();
        // @ts-ignore
        pubsubInstance.retry.reset();

        // @ts-ignore
        // eslint-disable-next-line promise/always-return, promise/catch-or-return, promise/prefer-await-to-then
        pubsubInstance._getDB().then(async db => {
          await db.query('NOTIFY foobar, \'{"abc":123}\'');
        });
      });

      return result;
    });
  });

  describe('publish', function () {
    it('should publish a notification', async () => {
      const [result, resolve] = resolveablePromise();

      const data = { abc: 123 };

      await pubsubInstance.addChannel('foobar', function (channelPayload) {
        channelPayload.should.deep.equal(data);
        resolve();
      });

      await pubsubInstance.publish('foobar', data);

      return result;
    });

    it('should not be vulnerable to SQL injection', async () => {
      const [result, resolve] = resolveablePromise();

      const data = { abc: '\'"; AND DO SOMETHING BAD' };

      await pubsubInstance.addChannel('foobar', function (channelPayload) {
        channelPayload.should.deep.equal(data);
        resolve();
      });

      await pubsubInstance.publish('foobar', data);

      return result;
    });

    it('should gracefully handle too large payloads', async () => {
      const data = Array.from({ length: 10000 });
      data.fill('a');
      return pubsubInstance.publish('foobar', data).should.be.rejectedWith(Error);
    });
  });
});

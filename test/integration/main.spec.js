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
process.on('unhandledRejection', err => { console.log('Unhandled Rejection:', err.stack); });

describe('Pubsub', function () {
  const PGPubsub = require('../../');

  const conStringInvalidUser = process.env.DATABASE_TEST_URL_INVALID_USER || 'postgres://invalidUsername@localhost/pgpubsub_test';
  const conStringInvalidPassword = process.env.DATABASE_TEST_URL_INVALID_PASSWORD || 'postgres://postgres:invalid@localhost/pgpubsub_test';

  let pubsubInstance, db;

  beforeEach(() => {
    pubsubInstance = new PGPubsub(connectionDetails, {
      log: function (...params) {
        if (typeof arguments[0] !== 'string' || !arguments[0].startsWith('Success')) {
          console.log.call(this, ...params);
        }
      }
    });

    return pubsubInstance._getDB()
      .then(dbResult => { db = dbResult; });
  });

  afterEach(() => pubsubInstance.close());

  describe('init', function () {
    this.timeout(2000);

    it('should handle errenous database user', () => {
      pubsubInstance.close();
      pubsubInstance = new PGPubsub(conStringInvalidUser, {
        log: () => {},
        retryLimit: 1
      });
      return pubsubInstance._getDB().should.be.rejectedWith(/Failed to establish database connection/);
    });

    // TODO: Fix, doesn't work on Travis right now
    it.skip('should handle errenous database password', () => {
      pubsubInstance.close();
      pubsubInstance = new PGPubsub(conStringInvalidPassword, {
        log: () => {},
        retryLimit: 1
      });
      return pubsubInstance._getDB().should.be.rejectedWith(/Failed to establish database connection/);
    });
  });

  describe('receive', function () {
    it('should receive a notification', function (done) {
      pubsubInstance.addChannel('foobar', function (channelPayload) {
        channelPayload.should.deep.equal({ abc: 123 });
        done();
      });

      setImmediate(function () {
        db.query('NOTIFY foobar, \'{"abc":123}\'');
      });
    });

    it('should handle non-JSON notifications', function (done) {
      pubsubInstance.addChannel('foobar', function (channelPayload) {
        channelPayload.should.equal('barfoo');
        done();
      });

      setImmediate(function () {
        db.query('NOTIFY foobar, \'barfoo\'');
      });
    });

    it('should only receive notifications from correct channel', function (done) {
      pubsubInstance.addChannel('foo', function (channelPayload) {
        channelPayload.should.deep.equal({ abc: 123 });
      });

      pubsubInstance.addChannel('bar', function (channelPayload) {
        channelPayload.should.deep.equal({ xyz: 789 });
        done();
      });

      setImmediate(function () {
        db.query('NOTIFY def, \'{"ghi":456}\'');
        db.query('NOTIFY foo, \'{"abc":123}\'');
        db.query('NOTIFY bar, \'{"xyz":789}\'');
      });
    });

    it('should handle non-alphanumeric channel names', function (done) {
      pubsubInstance.addChannel('97a38cd1-d332-4240-93e4-1ff436a7da2a', function (channelPayload) {
        channelPayload.should.deep.equal({ 'non-alpha': true });
        done();
      });

      setImmediate(function () {
        db.query('NOTIFY "97a38cd1-d332-4240-93e4-1ff436a7da2a", \'{"non-alpha":true}\'');
      });
    });

    it('should stop listening when channel is removed', function (done) {
      pubsubInstance.addChannel('foo', function () {
        throw new Error('This channel should have been removed and should not receive any items');
      });

      pubsubInstance.addChannel('foo', function () {
        throw new Error('This channel should have been removed and should not receive any items');
      });

      pubsubInstance.addChannel('bar', function () {
        done();
      });

      pubsubInstance.removeChannel('foo');

      setImmediate(function () {
        db.query('NOTIFY foo, \'{"abc":123}\'');
        db.query('NOTIFY bar, \'{"xyz":789}\'');
      });
    });

    it('should allow mutliple listener for same channel', function (done) {
      let first = false;

      pubsubInstance.addChannel('foobar', function () {
        first = true;
      });
      pubsubInstance.addChannel('foobar', function () {
        first.should.be.ok;
        done();
      });

      setImmediate(function () {
        db.query('NOTIFY foobar, \'{"abc":123}\'');
      });
    });

    it('should be able to remove specific listener', function (done) {
      const listener = function () {
        throw new Error('This channel should have been removed and should not receive any items');
      };

      pubsubInstance.addChannel('foobar', listener);

      pubsubInstance.addChannel('foobar', function () {
        done();
      });

      pubsubInstance.removeChannel('foobar', listener);

      setImmediate(function () {
        db.query('NOTIFY foobar, \'{"abc":123}\'');
      });
    });

    it('should support EventEmitter methods for listening', function (done) {
      pubsubInstance.addChannel('foobar');

      pubsubInstance.on('foobar', function () {
        done();
      });

      setImmediate(function () {
        db.query('NOTIFY foobar, \'{"abc":123}\'');
      });
    });

    it('should support recovery after reconnect', function (done) {
      pubsubInstance.addChannel('foobar', function () {
        done();
      });

      setImmediate(function () {
        db.end();
        pubsubInstance.retry.reset();

        pubsubInstance._getDB().then(db => {
          setImmediate(function () {
            db.query('NOTIFY foobar, \'{"abc":123}\'');
          });
        });
      });
    });
  });

  describe('publish', function () {
    it('should publish a notification', function (done) {
      const data = { abc: 123 };

      pubsubInstance.addChannel('foobar', function (channelPayload) {
        channelPayload.should.deep.equal(data);
        done();
      });

      pubsubInstance.publish('foobar', data);
    });

    it('should not be vulnerable to SQL injection', function (done) {
      const data = { abc: '\'"; AND DO SOMETHING BAD' };

      pubsubInstance.addChannel('foobar', function (channelPayload) {
        channelPayload.should.deep.equal(data);
        done();
      });

      pubsubInstance.publish('foobar', data);
    });

    it('should gracefully handle too large payloads', function () {
      const data = new Array(10000);
      data.fill('a');
      return pubsubInstance.publish('foobar', data).should.be.rejectedWith(Error);
    });
  });
});

/* jshint node: true, expr: true */
/* global beforeEach, afterEach, describe, it */

'use strict';

if (!process.env.DATABASE_TEST_URL) {
  require('dotenv').load();
}

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);
chai.should();

describe('Pubsub', function () {
  var PGPubsub = require('../../');

  var conString, pubsubInstance, db;

  beforeEach(function (done) {
    conString = process.env.DATABASE_TEST_URL || 'postgres://postgres@localhost/pgpubsub_test';

    pubsubInstance = new PGPubsub(conString, {
      log: function () {},
    });

    pubsubInstance._getDB(function (dbResult) {
      db = dbResult;
      done();
    });
  });

  afterEach(function () {
    pubsubInstance.close();
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
      var first = false;

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
      var listener = function () {
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

        pubsubInstance._getDB(function (db) {
          setImmediate(function () {
            db.query('NOTIFY foobar, \'{"abc":123}\'');
          });
        });
      });
    });

  });

  describe('publish', function () {

    it('should publish a notification', function (done) {
      var data = { abc: 123 };

      pubsubInstance.addChannel('foobar', function (channelPayload) {
        channelPayload.should.deep.equal(data);
        done();
      });

      pubsubInstance.publish('foobar', data);
    });

    it('should not be vulnerable to SQL injection', function (done) {
      var data = { abc: '\'"; AND DO SOMETHING BAD' };

      pubsubInstance.addChannel('foobar', function (channelPayload) {
        channelPayload.should.deep.equal(data);
        done();
      });

      pubsubInstance.publish('foobar', data);
    });

    it('should gracefully handle too large payloads', function () {
      var data = new Array(10000);
      data.fill('a');
      return pubsubInstance.publish('foobar', data).should.be.rejectedWith(Error);
    });

  });

});

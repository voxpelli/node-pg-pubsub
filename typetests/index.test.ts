import { expect } from 'tstyche';

import PGPubsub = require('../index.js');
import type { ClientConfig } from 'pg';
import type EventEmitter from 'node:events';

// PGPubsub extends EventEmitter
expect<PGPubsub>().type.toBeAssignableTo<EventEmitter>();

// Constructor accepts no arguments
expect(new PGPubsub()).type.toBe<PGPubsub>();

// Constructor accepts a connection string
expect(new PGPubsub('postgres://localhost/test')).type.toBe<PGPubsub>();

// Constructor accepts a ClientConfig object
expect(new PGPubsub({ connectionString: 'postgres://localhost/test' } satisfies ClientConfig)).type.toBe<PGPubsub>();

// Constructor accepts options as second argument
expect(new PGPubsub(undefined, { log: console.log, retryLimit: 5 })).type.toBe<PGPubsub>();

// addChannel returns Promise<void>
declare const ps: PGPubsub;
expect(ps.addChannel('channel')).type.toBe<Promise<void>>();

// addChannel with callback returns Promise<void>
expect(ps.addChannel('channel', () => {})).type.toBe<Promise<void>>();

// removeChannel returns this (PGPubsub)
expect(ps.removeChannel('channel')).type.toBe<PGPubsub>();

// removeChannel with callback returns this (PGPubsub)
expect(ps.removeChannel('channel', () => {})).type.toBe<PGPubsub>();

// publish returns Promise<void>
expect(ps.publish('channel')).type.toBe<Promise<void>>();

// publish with data returns Promise<void>
expect(ps.publish('channel', { some: 'data' })).type.toBe<Promise<void>>();

// close returns Promise<void>
expect(ps.close()).type.toBe<Promise<void>>();

// reset returns void
expect(ps.reset()).type.toBe<void>();

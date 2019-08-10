# Changelog

## 0.5.0 (2019-08-10)

* **Breaking change:** Now requires Node.js >=10.x
* **Dependencies:** Updated to `promised-retry` version `0.3.x`
* **Improvement:** Improved JSDoc documentation + added linting of it through TypeScript
* **Improvement:** Payload is optional on publishing

## 0.4.1 (2018-09-17)

* **Somewhat breaking change:** Logging is silenced in production by default
* **Feature:** `.close()` now returns a `Promise` that's resolved when the database has been fully shutdown

## 0.4.0 (2018-06-17)

* **Breaking change:** Now requires Node.js >=6.x
* **Internal:** Modernized linting setup, now based on [semistandard](https://github.com/Flet/semistandard)
* **Internal:** Made use of more modern Node.js and moved to `const`/`let` and arrow functions, thus simplifying the code base
* **Internal:** Now uses latest version of the `pg`-dependency

## 0.3.0 (2016-05-22)

### Features

* **main:** ensure publish errors can be caught ([7c6cb05c](http://github.com/voxpelli/node-pg-pubsub/commit/7c6cb05c1a40b9b4e7f5a8f7d3ba12311c778230), closes [#8](http://github.com/voxpelli/node-pg-pubsub/issues/8))

## 0.2.3 (2016-05-22)

### Bug Fixes

* **main:** avoid possible SQL injection ([82db22a5](http://github.com/voxpelli/node-pg-pubsub/commit/82db22a5b6ec27dd95be4e8e0e812de627fd5c9f), closes [#9](http://github.com/voxpelli/node-pg-pubsub/issues/9))

## 0.2.2 (2015-08-21)

### Bug Fixes

* **main:** run the EventEmitter constructor ([5e7909c4](http://github.com/voxpelli/node-pg-pubsub/commit/5e7909c440848b07b4824eb5c2a684d7a0b37cfc))

## 0.2.1 (2015-08-11)

### Bug Fixes

* **dependencies:** make "pg" a full dependency ([76768640](http://github.com/voxpelli/node-pg-pubsub/commit/767686400fc3099a573a359fecc8d7ef4a5065f4), closes [#2](http://github.com/voxpelli/node-pg-pubsub/issues/2))

## 0.2.0 (2015-08-05)

As `0.1.2` contained breaking changes it has been unpublished and replaced with this version.

## 0.1.2 (2015-08-05)

### Bug Fixes

* **main:**
  * updated dependencies, tests etc ([6632cd2e](http://github.com/voxpelli/node-pg-pubsub/commit/6632cd2ef0a469d4345f50f82aa357192571503e))
  * don’t warn about many listeners ([d58e5699](http://github.com/voxpelli/node-pg-pubsub/commit/d58e5699be134e4c42f09cce4a43adea2267cf40))

### Features

* **main:** a method for publishing notifications ([dc14d9af](http://github.com/voxpelli/node-pg-pubsub/commit/dc14d9af9294511dcba4a0cf70377167cf01115c), closes [#1](http://github.com/voxpelli/node-pg-pubsub/issues/1))

### Breaking Changes

* Now requires at least Node 0.12 or iojs

BREAKING CHANGE: Now requires the "pg" package, the "pg.js" one is no longer supported as it has been discontinued.
 ([6632cd2e](http://github.com/voxpelli/node-pg-pubsub/commit/6632cd2ef0a469d4345f50f82aa357192571503e))

## 0.1.1 (2015-03-28)

### Bug Fixes

* **main:** removed unknown variable in close() ([cb9d41e8](http://github.com/voxpelli/node-pg-pubsub/commit/cb9d41e82f6a9ab5208466407650bd2af4af2b06))

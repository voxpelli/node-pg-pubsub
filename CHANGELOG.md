### 0.2.2 (2015-08-21)


#### Bug Fixes

* **main:** run the EventEmitter constructor ([5e7909c4](http://github.com/voxpelli/node-pg-pubsub/commit/5e7909c440848b07b4824eb5c2a684d7a0b37cfc))


### 0.2.1 (2015-08-11)


#### Bug Fixes

* **dependencies:** make "pg" a full dependency ([76768640](http://github.com/voxpelli/node-pg-pubsub/commit/767686400fc3099a573a359fecc8d7ef4a5065f4), closes [#2](http://github.com/voxpelli/node-pg-pubsub/issues/2))


## 0.2.0 (2015-08-05)

As `0.1.2` contained breaking changes it has been unpublished and replaced with this version.

### 0.1.2 (2015-08-05)


#### Bug Fixes

* **main:**
  * updated dependencies, tests etc ([6632cd2e](http://github.com/voxpelli/node-pg-pubsub/commit/6632cd2ef0a469d4345f50f82aa357192571503e))
  * don’t warn about many listeners ([d58e5699](http://github.com/voxpelli/node-pg-pubsub/commit/d58e5699be134e4c42f09cce4a43adea2267cf40))


#### Features

* **main:** a method for publishing notifications ([dc14d9af](http://github.com/voxpelli/node-pg-pubsub/commit/dc14d9af9294511dcba4a0cf70377167cf01115c), closes [#1](http://github.com/voxpelli/node-pg-pubsub/issues/1))


#### Breaking Changes

* Now requires at least Node 0.12 or iojs

BREAKING CHANGE: Now requires the "pg" package, the "pg.js" one is no longer supported as it has been discontinued.
 ([6632cd2e](http://github.com/voxpelli/node-pg-pubsub/commit/6632cd2ef0a469d4345f50f82aa357192571503e))


### 0.1.1 (2015-03-28)


#### Bug Fixes

* **main:** removed unknown variable in close() ([cb9d41e8](http://github.com/voxpelli/node-pg-pubsub/commit/cb9d41e82f6a9ab5208466407650bd2af4af2b06))


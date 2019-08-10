// @ts-check
/// <reference types="node" />

'use strict';

const pathModule = require('path');

const dotEnvFile = process.env.DOTENV_FILE || pathModule.resolve(__dirname, './.env');

require('dotenv').config({ path: dotEnvFile });

const connectionDetails = process.env.DATABASE_TEST_URL || {
  database: process.env.PGDATABASE || 'pgpubsub_test'
};

module.exports = { connectionDetails };

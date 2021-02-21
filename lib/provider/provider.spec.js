/* eslint-disable no-unused-expressions */
const fs = require('fs');
const path = require('path');
const { expect } = require('chai');
const { promisify } = require('util');
const http = require('http');
const rimraf = require('rimraf');

const app = require('../../app');
const { genShaSums, publish } = require('./provider');

const access = promisify(fs.access);

describe('provider cli', () => {
  describe('genShaSums()', async () => {
    const prefix = 'citizen_0.1.1';
    const targetDir = path.join(__dirname, '..', 'fixture', 'provider1');
    const shasumsFile = path.join(targetDir, `${prefix}_SHA256SUMS`);

    after((done) => {
      rimraf(shasumsFile, done);
    });

    it('should generate shasums file from zip files', async () => {
      await genShaSums(prefix, targetDir);

      await access(shasumsFile, fs.constants.F_OK);
    });
  });
});

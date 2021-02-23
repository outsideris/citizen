/* eslint-disable no-unused-expressions */
const fs = require('fs');
const path = require('path');
const { expect } = require('chai');
const { promisify } = require('util');
const http = require('http');
const tmp = require('tmp');
const AdmZip = require('adm-zip');

const app = require('../../app');
const { genShaSums } = require('./provider');

const access = promisify(fs.access);
const readFile = promisify(fs.readFile);

describe('provider cli', () => {
  describe('genShaSums()', () => {
    let targetDir;
    let cleanup;
    before((done) => {
      tmp.dir({ unsafeCleanup: true }, (err, tempDir, cleanupCallback) => {
        if (err) { return done(err); }
        targetDir = tempDir;
        cleanup = cleanupCallback;

        const zip = new AdmZip();
        const content = 'resource "aws_alb" "main" {}';
        zip.addFile("main.tf", Buffer.alloc(content.length, content));
        zip.writeZip(`${tempDir}/files.zip`);
        done();
      });
    });

    after(() => {
      cleanup();
    });

    it('should generate shasums file from zip files', async () => {
      const prefix = 'citizen_0.1.1';
      const shasumsFile = path.join(targetDir, `${prefix}_SHA256SUMS`);
      await genShaSums(prefix, targetDir);

      await access(shasumsFile, fs.constants.F_OK);
      const content = await readFile(shasumsFile, 'utf8');
      expect(content).to.include('files.zip');
    });
  });
});

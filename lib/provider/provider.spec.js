/* eslint-disable no-unused-expressions */
const fs = require('fs');
const path = require('path');
const { expect } = require('chai');
const { promisify } = require('util');
const tmp = require('tmp');
const AdmZip = require('adm-zip');

const { genShaSums, sign } = require('./provider');

const access = promisify(fs.access);
const readFile = promisify(fs.readFile);

const prepareProvider = (filenames, cb) => {
  tmp.dir({ unsafeCleanup: true }, (err, tempDir, cleanupCallback) => {
    if (err) { return cb(err); }

    const zip = new AdmZip();
    const content = 'resource "aws_alb" "main" {}';
    zip.addFile("main.tf", Buffer.alloc(content.length, content));
    filenames.forEach((f) => {
      zip.writeZip(`${tempDir}/${f}.zip`);
    });
    cb(null, tempDir, cleanupCallback);
  });
}

describe('provider cli', () => {
  describe('genShaSums()', () => {
    let targetDir;
    let cleanup;
    before((done) => {
      prepareProvider(['files'], (err, tempDir, cleanupCallback) => {
        if (err) { return done(err); }
        targetDir = tempDir;
        cleanup = cleanupCallback;
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

  describe('sign()', () => {
    let targetDir;
    let cleanup;
    let shaSumsFile;
    before((done) => {
      prepareProvider(['files'], async (err, tempDir, cleanupCallback) => {
        if (err) { return done(err); }
        targetDir = tempDir;
        cleanup = cleanupCallback;

        try {
          const prefix = 'citizen_0.1.1';
          shaSumsFile = await genShaSums(prefix, targetDir)
          done();
        } catch(e) {
          return done(e);
        }
      });
    });

    after(() => {
      cleanup();
    });

    it('should generate signature file of shasums file', async () => {
      const signatureFile = await sign(shaSumsFile, targetDir);
      const sigFileFullPath = path.join(targetDir, signatureFile);

      await access(sigFileFullPath, fs.constants.F_OK);
      const content = await readFile(sigFileFullPath);
      expect(content).to.be.an.instanceOf(Buffer);
    });

    it('should overwrite signature file', async () => {
      await sign(shaSumsFile, targetDir);
      const signatureFile = await sign(shaSumsFile, targetDir);

      const sigFileFullPath = path.join(targetDir, signatureFile);
      await access(sigFileFullPath, fs.constants.F_OK);
      const content = await readFile(sigFileFullPath);
      expect(content).to.be.an.instanceOf(Buffer);
    });
  });
});

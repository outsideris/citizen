/* eslint-disable no-unused-expressions */
const fs = require('fs');
const http = require('http');
const path = require('path');
const { expect } = require('chai');
const { promisify } = require('util');
const tmp = require('tmp');
const AdmZip = require('adm-zip');
const rimraf = promisify(require('rimraf'));

const app = require('../../app');
const {
  genShaSums,
  sign,
  exportPublicKey,
  publish,
} = require('./provider');
const { providerDb } = require('../../stores/store');
const { deleteDbAll } = require('../../test/helper');

const access = promisify(fs.access);
const readFile = promisify(fs.readFile);

const prepareProvider = (filenames, cb) => {
  tmp.dir({ unsafeCleanup: true }, (err, tempDir, cleanupCallback) => {
    if (err) { return cb(err); }

    const zip = new AdmZip();
    const content = 'resource "aws_alb" "main" {}';
    zip.addFile('main.tf', Buffer.alloc(content.length, content));
    filenames.forEach((f) => {
      zip.writeZip(`${tempDir}/${f}.zip`);
    });
    return cb(null, tempDir, cleanupCallback);
  });
};

describe('provider cli', () => {
  describe('genShaSums()', () => {
    let targetDir;
    let cleanup;
    before((done) => {
      prepareProvider(['files'], (err, tempDir, cleanupCallback) => {
        if (err) { return done(err); }
        targetDir = tempDir;
        cleanup = cleanupCallback;
        return done();
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
          shaSumsFile = await genShaSums(prefix, targetDir);
          return done();
        } catch (e) {
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

  describe('exportPublicKey()', () => {
    it('should export GPG public key', async () => {
      const publicKey = await exportPublicKey();
      expect(publicKey).to.include('PGP PUBLIC KEY BLOCK');
    });

    it('should print error message', async () => {
      try {
        await exportPublicKey('wrongkey');
        throw new Error('Test failed');
      } catch (e) {
        expect(e).to.include('gpg: WARNING: nothing exported');
      }
    });
  });

  describe('publish()', () => {
    let server;
    const port = 20000;
    const registry = `http://127.0.0.1:${port}`;

    let targetDir;
    let cleanup;
    let shaSumsFile;
    const prefix = 'outsider-citizen_0.3.1';
    const providerPostfix1 = '_darwin_amd64';
    const providerPostfix2 = '_linux_amd64';

    before((done) => {
      const files = [`${prefix}${providerPostfix1}`, `${prefix}${providerPostfix2}`];
      prepareProvider(files, async (err, tempDir, cleanupCallback) => {
        if (err) { return done(err); }
        targetDir = tempDir;
        cleanup = cleanupCallback;

        try {
          shaSumsFile = await genShaSums(prefix, targetDir);
          await sign(shaSumsFile, targetDir);
          server = http.createServer(app);
          server.listen(port);
          return server.on('listening', done);
        } catch (e) {
          return done(e);
        }
      });
    });

    after(async () => {
      server.close();
      cleanup();
      await deleteDbAll(providerDb());
      await rimraf(process.env.CITIZEN_STORAGE_PATH);
    });

    it('should upload the provider into registry', async () => {
      const providerPath = 'outsider/citizen/0.3.1';
      const providerData = {
        namespace: 'outsider',
        type: 'citizen',
        version: '0.3.1',
        protocols: ['4.1', '5.0'],
        platforms: [
          {
            filename: `${prefix}${providerPostfix1}.zip`,
            os: 'darwin',
            arch: 'amd64',
          },
          {
            filename: `${prefix}${providerPostfix2}.zip`,
            os: 'linux',
            arch: 'amd64',
          },
        ],
      };

      const files = [
        {
          filename: `${prefix}${providerPostfix1}.zip`,
          stream: fs.createReadStream(path.join(targetDir, `${prefix}${providerPostfix1}.zip`)),
        },
        {
          filename: `${prefix}${providerPostfix2}.zip`,
          stream: fs.createReadStream(path.join(targetDir, `${prefix}${providerPostfix2}.zip`)),
        },
        {
          filename: `${prefix}_SHA256SUMS`,
          stream: fs.createReadStream(path.join(targetDir, `${prefix}_SHA256SUMS`)),
        },
        {
          filename: `${prefix}_SHA256SUMS.sig`,
          stream: fs.createReadStream(path.join(targetDir, `${prefix}_SHA256SUMS.sig`)),
        },
      ];

      const res = await publish(registry, providerPath, providerData, files);
      const body = JSON.parse(res.body);
      expect(body).to.have.property('namespace').to.equal(providerData.namespace);
      expect(body).to.have.property('type').to.equal(providerData.type);
      expect(body).to.have.property('version').to.equal(providerData.version);
      expect(body).to.have.property('protocols').to.include(providerData.protocols[0]);
      expect(body).to.have.property('protocols').to.include(providerData.protocols[1]);
      expect(body).to.have.property('platforms').to.instanceOf(Array);
      expect(body).to.have.property('published_at');
    });
  });
});

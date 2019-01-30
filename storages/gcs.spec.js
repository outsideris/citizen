/* eslint-disable no-unused-expressions */
const path = require('path');
const fs = require('fs');
const { expect } = require('chai');
const { promisify } = require('util');
const { Storage } = require('@google-cloud/storage');

const gcs = new Storage();
const GCS_BUCKET = process.env.CITIZEN_GCP_GCS_BUCKET;
const { enableMock, clearMock } = require('../test/helper');
const { saveModule, hasModule, getModule } = require('./gcs');

const readFile = promisify(fs.readFile);

describe('gcs\'s', async () => {
  const modulePath = `citizen/${(new Date()).getTime()}/test.tar.gz`;
  const tarballPath = path.join(__dirname, '../test', 'fixture/test.tar.gz');
  let moduleBuf;

  before(async () => {
    enableMock({ modulePath });
    moduleBuf = await readFile(tarballPath);
  });

  after(() => {
    clearMock();
  });

  describe('saveModule()', () => {
    after(async () => {
      const bucket = gcs.bucket(GCS_BUCKET);
      const file = bucket.file(modulePath);
      await file.delete();
    });

    it('should save the module onto GCS', async () => {
      const result = await saveModule(modulePath, moduleBuf);
      expect(result).to.be.true;
    });
  });

  describe('hasModule()', () => {
    before(async () => {
      const bucket = gcs.bucket(GCS_BUCKET);
      const file = bucket.file(modulePath);
      await file.save(tarballPath);
    });

    after(async () => {
      const bucket = gcs.bucket(GCS_BUCKET);
      const file = bucket.file(modulePath);
      await file.delete();
    });

    it('should return true if the module already exists', async () => {
      const exist = await hasModule(modulePath);
      expect(exist).to.be.true;
    });

    it('should return false if the module does not already exist', async () => {
      const exist = await hasModule(`${modulePath}/wrong`);
      expect(exist).to.be.false;
    });
  });

  describe('getModule()', () => {
    before(async () => {
      const bucket = gcs.bucket(GCS_BUCKET);
      const file = bucket.file(modulePath);
      await file.save(tarballPath);
    });

    after(async () => {
      const bucket = gcs.bucket(GCS_BUCKET);
      const file = bucket.file(modulePath);
      await file.delete();
    });

    it('should get file buffer from GCS', async () => {
      const result = await getModule(modulePath);
      expect(result).to.be.an.instanceof(Buffer);
    });
  });
});

/* eslint-disable no-unused-expressions */
const path = require('path');
const fs = require('fs');
const { expect } = require('chai');
const { promisify } = require('util');
const AWS = require('aws-sdk');

const s3 = new AWS.S3({ apiVersion: '2006-03-01' });
const { enableMock, clearMock } = require('../test/helper');
const { saveModule, hasModule, getModule } = require('./s3');

const readFile = promisify(fs.readFile);
s3.save = promisify(s3.putObject);
s3.delete = promisify(s3.deleteObject);

describe('s3\'s', async () => {
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
      const params = {
        Bucket: process.env.CITIZEN_AWS_S3_BUCKET,
        Key: modulePath,
      };
      await s3.delete(params);
    });

    it('should save the module onto S3', async () => {
      const result = await saveModule(modulePath, moduleBuf);
      expect(result).to.be.true;
    });
  });

  describe('hasModule()', () => {
    before(async () => {
      const params = {
        Bucket: process.env.CITIZEN_AWS_S3_BUCKET,
        Key: modulePath,
        Body: moduleBuf,
      };
      await s3.save(params);
    });

    after(async () => {
      const params = {
        Bucket: process.env.CITIZEN_AWS_S3_BUCKET,
        Key: modulePath,
      };
      await s3.delete(params);
    });

    it('should return true if the module is already exist', async () => {
      const exist = await hasModule(modulePath);
      expect(exist).to.be.true;
    });

    it('should return false if the module is not already exist', async () => {
      const exist = await hasModule(`${modulePath}/wrong`);
      expect(exist).to.be.false;
    });
  });

  describe('getModule()', () => {
    before(async () => {
      const params = {
        Bucket: process.env.CITIZEN_AWS_S3_BUCKET,
        Key: modulePath,
        Body: moduleBuf,
      };
      await s3.save(params);
    });

    after(async () => {
      const params = {
        Bucket: process.env.CITIZEN_AWS_S3_BUCKET,
        Key: modulePath,
      };
      await s3.delete(params);
    });

    it('should get file buffer from S3', async () => {
      const result = await getModule(modulePath);
      expect(result).to.be.an.instanceof(Buffer);
    });
  });
});

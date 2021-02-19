const path = require('path');
const fs = require('fs');
const { expect } = require('chai');
const { promisify } = require('util');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({});
const { enableMock, clearMock } = require('../test/helper');
const { saveModule, hasModule, getModule } = require('./s3');

const readFile = promisify(fs.readFile);

describe('s3\'s', async () => {
  const modulePath = `citizen/${(new Date()).getTime()}/module.tar.gz`;
  const tarballPath = path.join(__dirname, '../test', 'fixture/module.tar.gz');
  let moduleBuf;

  before(async () => {
    enableMock({ modulePath: `modules/${modulePath}` });
    moduleBuf = await readFile(tarballPath);
  });

  after(() => {
    clearMock();
  });

  describe('saveModule()', () => {
    after(async () => {
      const params = {
        Bucket: process.env.CITIZEN_AWS_S3_BUCKET,
        Key: `modules/${modulePath}`,
      };
      await s3.send(new DeleteObjectCommand(params));
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
        Key: `modules/${modulePath}`,
        Body: moduleBuf,
      };
      await s3.send(new PutObjectCommand(params));
    });

    after(async () => {
      const params = {
        Bucket: process.env.CITIZEN_AWS_S3_BUCKET,
        Key: `modules/${modulePath}`,
      };
      await s3.send(new DeleteObjectCommand(params));
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
        Key: `modules/${modulePath}`,
        Body: moduleBuf,
      };
      await s3.send(new PutObjectCommand(params));
    });

    after(async () => {
      const params = {
        Bucket: process.env.CITIZEN_AWS_S3_BUCKET,
        Key: `modules/${modulePath}`,
      };
      await s3.send(new DeleteObjectCommand(params));
    });

    it('should get file buffer from S3', async () => {
      const result = await getModule(modulePath);
      expect(result).to.be.an.instanceof(Buffer);
    });
  });
});

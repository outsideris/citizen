import path from 'path';
import fs from 'fs';
import { expect } from 'chai';
import { promisify } from 'util';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { fileURLToPath } from 'url';

import helper from '../test/helper.js';
import s3 from './s3.js';

const s3client = new S3Client({});
const readFile = promisify(fs.readFile);

describe('s3\'s', async () => {
  const modulePath = `citizen/${(new Date()).getTime()}/module.tar.gz`;
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const tarballPath = path.join(__dirname, '../test', 'fixture/module.tar.gz');
  let moduleBuf;

  before(async () => {
    helper.enableMock({ modulePath: `modules/${modulePath}` });
    moduleBuf = await readFile(tarballPath);
  });

  after(() => {
    helper.clearMock();
  });

  describe('saveModule()', () => {
    after(async () => {
      const params = {
        Bucket: process.env.CITIZEN_AWS_S3_BUCKET,
        Key: `modules/${modulePath}`,
      };
      await s3client.send(new DeleteObjectCommand(params));
    });

    it('should save the module onto S3', async () => {
      const result = await s3.saveModule(modulePath, moduleBuf);
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
      await s3client.send(new PutObjectCommand(params));
    });

    after(async () => {
      const params = {
        Bucket: process.env.CITIZEN_AWS_S3_BUCKET,
        Key: `modules/${modulePath}`,
      };
      await s3client.send(new DeleteObjectCommand(params));
    });

    it('should return true if the module is already exist', async () => {
      const exist = await s3.hasModule(modulePath);
      expect(exist).to.be.true;
    });

    it('should return false if the module is not already exist', async () => {
      const exist = await s3.hasModule(`${modulePath}/wrong`);
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
      await s3client.send(new PutObjectCommand(params));
    });

    after(async () => {
      const params = {
        Bucket: process.env.CITIZEN_AWS_S3_BUCKET,
        Key: `modules/${modulePath}`,
      };
      await s3client.send(new DeleteObjectCommand(params));
    });

    it('should get file buffer from S3', async () => {
      const result = await s3.getModule(modulePath);
      expect(result).to.be.an.instanceof(Buffer);
    });
  });
});

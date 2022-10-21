const path = require('node:path');
const fs = require('node:fs');
const { expect } = require('chai');
const { promisify } = require('node:util');
const { Readable } = require('node:stream');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { mockClient } = require('aws-sdk-client-mock');

const s3 = require('./s3');

const s3Mock = mockClient(S3Client);
const readFile = promisify(fs.readFile);

describe("s3's", async () => {
  afterEach(() => {
    s3Mock.reset();
  });

  describe('Module', () => {
    const modulePath = `citizen/${new Date().getTime()}/module.tar.gz`;

    describe('saveModule()', () => {
      it('should save the module onto S3', async () => {
        s3Mock.on(PutObjectCommand).resolves({ ETag: '1234' });

        const tarballPath = path.join(__dirname, '../test', 'fixture/module.tar.gz');
        const moduleBuf = await readFile(tarballPath);

        const result = await s3.saveModule(modulePath, moduleBuf);
        expect(result).to.be.true;
      });
    });

    describe('hasModule()', () => {
      it('should return true if the module is already exist', async () => {
        s3Mock.on(GetObjectCommand).resolves({ Body: 'data' });

        const exist = await s3.hasModule(modulePath);
        expect(exist).to.be.true;
      });

      it('should return false if the module is not already exist', async () => {
        s3Mock.on(GetObjectCommand).rejects({ name: 'NoSuchKey' });

        const exist = await s3.hasModule(`${modulePath}/wrong`);
        expect(exist).to.be.false;
      });
    });

    describe('getModule()', () => {
      it('should get file buffer from S3', async () => {
        const buf = Buffer.from('data');
        s3Mock.on(GetObjectCommand).resolves({
          Body: Readable.from(buf),
        });

        const result = await s3.getModule(modulePath);
        expect(result).to.be.an.instanceof(Buffer);
      });
    });
  });

  describe('Provider', () => {
    const providerPath = `citizen/${new Date().getTime()}/provider.tar.gz`;

    describe('saveProvider()', () => {
      it('should save the provider onto S3', async () => {
        s3Mock.on(PutObjectCommand).resolves({ ETag: '1234' });

        const tarballPath = path.join(
          __dirname,
          '../test',
          'fixture/provider/terraform-provider-null_1.0.0_linux_amd64.zip'
        );
        const providerBuf = await readFile(tarballPath);

        const result = await s3.saveProvider(providerPath, providerBuf);
        expect(result).to.be.true;
      });
    });

    describe('getProvider()', () => {
      it('should return true if the provider is already exist', async () => {
        s3Mock.on(GetObjectCommand).resolves({ Body: 'data' });

        const exist = await s3.hasProvider(providerPath);
        expect(exist).to.be.true;
      });

      it('should return false if the module is not already exist', async () => {
        s3Mock.on(GetObjectCommand).rejects({ name: 'NoSuchKey' });

        const exist = await s3.hasProvider(`${providerPath}/wrong`);
        expect(exist).to.be.false;
      });
    });

    describe('getProvider()', () => {
      it('should get file buffer from S3', async () => {
        const buf = Buffer.from('data');
        s3Mock.on(GetObjectCommand).resolves({
          Body: Readable.from(buf),
        });

        const result = await s3.getProvider(providerPath);
        expect(result).to.be.an.instanceof(Buffer);
      });
    });
  });
});

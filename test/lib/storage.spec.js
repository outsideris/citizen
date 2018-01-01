const path = require('path');
const fs = require('fs');
const { expect } = require('chai');
const { promisify } = require('util');
const AWS = require('aws-sdk');

const s3 = new AWS.S3({ apiVersion: '2006-03-01' });
const { saveModule } = require('../../lib/storage');

const readFile = promisify(fs.readFile);
s3.delete = promisify(s3.deleteObject);

describe('storage\'s', () => {
  describe('saveModule()', () => {
    let moduleBuf;
    const modulePath = `citizen/${(new Date()).getTime()}/test.tar.gz`;

    before(async () => {
      const tarballPath = path.join(__dirname, '..', 'fixture/test.tar.gz');
      moduleBuf = await readFile(tarballPath);
    });

    after(async () => {
      const params = {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: modulePath,
      };
      await s3.delete(params);
    });

    it('should save the module onto S3', async () => {
      const result = await saveModule(modulePath, moduleBuf);
      expect(result).to.have.property('ETag');
    });
  });
});

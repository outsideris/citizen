const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const debug = require('debug')('citizen:server');

const s3client = new S3Client({});

const S3_BUCKET = process.env.CITIZEN_STORAGE_BUCKET;
if (process.env.CITIZEN_STORAGE === 's3' && !S3_BUCKET) {
  throw new Error(
    'S3 storage requires CITIZEN_STORAGE_BUCKET. Additionally, ensure that either AWS_PROFILE or AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are set. If running on AWS EC2 or ECS, IAM Roles may be used.',
  );
}

const s3 = {
  type: () => 's3',
  setItem: async (path, tarball) => {
    debug(`set item in ${path}.`);

    if (!path) {
      throw new Error('path is required.');
    }
    if (!tarball) {
      throw new Error('tarball is required.');
    }

    const params = {
      Bucket: S3_BUCKET,
      Key: path,
      Body: tarball,
    };
    const res = await s3client.send(new PutObjectCommand(params));

    if (res.ETag) {
      return true;
    }
    return false;
  },
  hasItem: async (path) => {
    const params = {
      Bucket: S3_BUCKET,
      Key: path,
    };

    try {
      const res = await s3client.send(new GetObjectCommand(params));
      if (res.Body) {
        debug(`the item already exist: ${path}.`);
        return true;
      }
    } catch (err) {
      if (err.name === 'NoSuchKey') {
        debug(`the item doesn't exist: ${path}.`);
        return false;
      }

      throw err;
    }

    debug(`the item doesn't exist: ${path}.`);
    return false;
  },
  getItem: async (path) => {
    debug(`get item from ${path}`);
    const params = {
      Bucket: S3_BUCKET,
      Key: path,
    };
    const chunks = [];
    const file = await s3client.send(new GetObjectCommand(params));
    const content = await new Promise((resolve, reject) => {
      file.Body.on('data', (chunk) => chunks.push(chunk));
      file.Body.on('error', reject);
      file.Body.on('end', () => resolve(Buffer.concat(chunks)));
    });

    return content;
  },
};

module.exports = s3;

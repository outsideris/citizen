const request = require('supertest');
const { expect } = require('chai');
const AWS = require('aws-sdk');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const nock = require('nock');

const app = require('../app');
const { deleteDbAll } = require('../test/helper');
const { db, save } = require('../lib/store');
const { enableMock, clearMock } = require('../test/helper');

const s3 = new AWS.S3({ apiVersion: '2006-03-01' });
s3.delete = promisify(s3.deleteObject);

describe('GET /v1/:namespace/:name/:provider/:version/download', () => {
  before(async () => {
    await save({
      namespace: 'download', name: 'source', provider: 'aws', version: '1.2.0', location: 'download/source/aws/1.2.0/module.tar.gz',
    });
  });

  after(async () => {
    await deleteDbAll(db);
  });

  it('should return the location which client can download source code', () =>
    request(app)
      .get('/v1/download/source/aws/1.2.0/download')
      .expect(204)
      .then((res) => {
        expect(res.headers).to.have.property('x-terraform-get')
          .to.equal('/v1/tarball/download/source/aws/1.2.0/module.tar.gz');
      }));

  it('should return 404 if given module does not exist', () =>
    request(app)
      .get('/v1/download/source/aws/2.2.0/download')
      .expect('Content-Type', /application\/json/)
      .expect(404)
      .then((res) => {
        expect(res.body).to.have.property('errors').to.be.an('array');
      }));
});

describe('GET /v1/:namespace/:name/:provider/download', () => {
  before(async () => {
    await save({
      namespace: 'download', name: 'source', provider: 'aws', version: '1.2.0', location: 'download/source/aws/1.2.0/module.tar.gz',
    });
    await save({
      namespace: 'download', name: 'source', provider: 'aws', version: '1.3.0', location: 'download/source/aws/1.3.0/module.tar.gz',
    });
  });

  after(async () => {
    await deleteDbAll(db);
  });

  it('should redirect to the latest version of a module', () =>
    request(app)
      .get('/v1/download/source/aws/download')
      .expect(302)
      .then((res) => {
        expect(res.headers).to.have.property('location')
          .to.equal('/v1/download/source/aws/1.3.0/download');
      }));
});

describe('GET /v1/tarball/:namespace/:name/:provider/*.tar.gz', () => {
  const version = (new Date()).getTime();
  const modulePath = `download/tar/aws/${version}`;

  beforeEach(async () => {
    enableMock({ modulePath: `${modulePath}/module.tar.gz` });
    await request(app)
      .post(`/v1/${modulePath}`)
      .attach('module', 'test/fixture/module.tar.gz')
      .expect(201);
    clearMock();

    if (process.env.MOCK) {
      nock('https://s3.ap-northeast-1.amazonaws.com')
        .persist()
        .get(`/${process.env.CITIZEN_AWS_S3_BUCKET}/${modulePath}/module.tar.gz`)
        .once()
        .reply(() =>
          [200, new Array(137).join('a'),
            ['x-amz-id-2', 'UTXd/Ac9Lpf5htlqmY7jIa//st0VNw3HiV0H2tFpjQrabzdF0a1A0RXwaXXEDJsSMC0z9ieqSJg=',
              'x-amz-request-id', '51DCE049BC4189E5',
              'Date', 'Sun, 21 Jan 2018 16:47:35 GMT',
              'Last-Modified', 'Sun, 21 Jan 2018 16:47:35 GMT',
              'ETag', '"ed168b6114db5f54d38bb1bd9ba45106"',
              'Accept-Ranges', 'bytes',
              'Content-Type', 'application/octet-stream',
              'Content-Length', '136',
              'Server', 'AmazonS3'],
          ]);
    }
  });

  afterEach(async () => {
    if (process.env.MOCK) {
      nock.cleanAll();
    }
    await deleteDbAll(db);
  });

  it('should download a tarball for a specific module', () => {
    const targetFile = fs.readFileSync(path.join(__dirname, '../test', 'fixture/test.tar.gz'));
    const contentLength = `${targetFile.length}`;

    return request(app)
      .get(`/v1/tarball/download/tar/aws/${version}/module.tar.gz`)
      .expect(200)
      .then((res) => {
        expect(res.headers).to.have.property('content-disposition');
        expect(res.headers).to.have.property('content-length')
          .to.equal(contentLength);
      });
  });

  it('should increase download count for a specific module', () =>
    request(app)
      .get(`/v1/tarball/download/tar/aws/${version}/module.tar.gz`)
      .expect(200)
      .then(() =>
        db.find({
          selector: {
            namespace: { $eq: 'download' },
            name: { $eq: 'tar' },
            provider: { $eq: 'aws' },
            version: { $eq: `${version}` },
          },
        }))
      .then((doc) => {
        expect(doc.docs[0]).to.have.property('downloads').to.equal(1);
      }));
});

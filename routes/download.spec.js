const request = require('supertest');
const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const rimraf = promisify(require('rimraf'));

const app = require('../app');
const { deleteDbAll } = require('../test/helper');
const { db, save } = require('../lib/store');

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
    await request(app)
      .post(`/v1/${modulePath}`)
      .attach('module', 'test/fixture/module.tar.gz')
      .expect(201);
  });

  afterEach(async () => {
    await deleteDbAll(db);
    await rimraf(process.env.CITIZEN_STORAGE_PATH);
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

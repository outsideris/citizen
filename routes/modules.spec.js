const request = require('supertest');
const { expect } = require('chai');
const AWS = require('aws-sdk');
const { promisify } = require('util');

const app = require('../app');
const { enableMock, clearMock, deleteDbAll } = require('../test/helper');
const { db, save } = require('../lib/store');

const s3 = new AWS.S3({ apiVersion: '2006-03-01' });
s3.delete = promisify(s3.deleteObject);

describe('POST /v1/modules/:namespace/:name/:provider/:version', () => {
  const modulePath = `hashicorp/consul/aws/${(new Date()).getTime()}`;

  before(() => {
    enableMock({ modulePath: `${modulePath}/module.tar.gz` });
    enableMock({ modulePath: `${modulePath}/test.tar.gz` });
  });

  after(async () => {
    if (process.env.MOCK) {
      return clearMock();
    }

    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: modulePath,
    };
    const result = await s3.delete(params);
    return result;
  });

  it('should register new module', () =>
    request(app)
      .post(`/v1/modules/${modulePath}`)
      .attach('module', 'test/fixture/module.tar.gz')
      .expect('Content-Type', /application\/json/)
      .expect(201)
      .then((res) => {
        expect(res.body).to.have.property('modules').to.be.an('array');
        expect(res.body.modules[0]).to.have.property('id').to.equal(modulePath);
      }));

  it('should reject the reqeust if the module is already exists.', () =>
    request(app)
      .post(`/v1/modules/${modulePath}`)
      .attach('module', 'test/fixture/test.tar.gz')
      .expect('Content-Type', /application\/json/)
      .expect(409)
      .then((res) => {
        expect(res.body).to.have.property('errors').to.be.an('array');
      }));

  it('should register new module with owner infomation', () =>
    request(app)
      .post(`/v1/modules/${modulePath}`)
      .field('owner', 'outsideris')
      .attach('module', 'test/fixture/module.tar.gz')
      .expect('Content-Type', /application\/json/)
      .expect(201)
      .then((res) => {
        expect(res.body).to.have.property('modules').to.be.an('array');
        expect(res.body.modules[0]).to.have.property('id').to.equal(modulePath);
      }));
});

describe('GET /v1/modules/:namespace/:name/:provider/:version', () => {
  before(async () => {
    await save({
      namespace: 'router', name: 'specific', provider: 'aws', version: '1.1.2', owner: '',
    });
  });

  after(async () => {
    await deleteDbAll(db);
  });

  it('should return a specific module', () =>
    request(app)
      .get('/v1/modules/router/specific/aws/1.1.2')
      .expect('Content-Type', /application\/json/)
      .expect(200)
      .then((res) => {
        expect(res.body).to.have.property('id').to.equal('router/specific/aws/1.1.2');
        expect(res.body).to.have.property('version').to.equal('1.1.2');
      }));

  it('should return 404 if given module does not exist', () =>
    request(app)
      .get('/v1/modules/router/specific/aws/2.1.2')
      .expect('Content-Type', /application\/json/)
      .expect(404));
});

describe('GET /v1/modules/:namespace/:name/:provider', () => {
  before(async () => {
    await save({
      namespace: 'router', name: 'latest', provider: 'aws', version: '1.1.1', owner: '',
    });
    await save({
      namespace: 'router', name: 'latest', provider: 'aws', version: '1.1.2', owner: '',
    });
  });

  after(async () => {
    await deleteDbAll(db);
  });

  it('should return latest version for a specific module provider', () =>
    request(app)
      .get('/v1/modules/router/latest/aws')
      .expect('Content-Type', /application\/json/)
      .expect(200)
      .then((res) => {
        expect(res.body).to.have.property('version').to.equal('1.1.2');
      }));

  it('should return 404 if given module does not exist', () =>
    request(app)
      .get('/v1/modules/router/latest/nomodule')
      .expect('Content-Type', /application\/json/)
      .expect(404)
      .then((res) => {
        expect(res.body).to.have.property('errors').to.be.an('array');
      }));
});

const request = require('supertest');
const { expect } = require('chai');
const AWS = require('aws-sdk');
const { promisify } = require('util');

const app = require('../../app');

const s3 = new AWS.S3({ apiVersion: '2006-03-01' });
s3.delete = promisify(s3.deleteObject);

describe('POST /v1/modules/:namespace/:name/:provider/:version', () => {
  const modulePath = `hashicorp/consul/aws/${(new Date()).getTime()}`;

  after(async () => {
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
      .attach('module', 'test/fixture/test.tar.gz')
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
});

describe('GET /v1/modules/:namespace/:name/:provider/versions', () => {
  it('should return as application/json', () =>
    request(app)
      .get('/v1/modules/hashicorp/consul/aws/versions')
      .expect('Content-Type', /application\/json/)
      .expect(200)
      .then((res) => {
        expect(res.body).to.have.property('modules').to.be.an('array');
      }));
});

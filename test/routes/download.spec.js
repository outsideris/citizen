const request = require('supertest');
const { expect } = require('chai');
const AWS = require('aws-sdk');
const { promisify } = require('util');

const app = require('../../app');
const { deleteDbAll } = require('../helper');
const { db, save } = require('../../lib/store');

const s3 = new AWS.S3({ apiVersion: '2006-03-01' });
s3.delete = promisify(s3.deleteObject);

describe('GET /v1/modules/:namespace/:name/:provider/:version/download', () => {
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
      .get('/v1/modules/download/source/aws/1.2.0/download')
      .expect(204)
      .then((res) => {
        expect(res.headers).to.have.property('x-terraform-get')
          .to.equal('/v1/modules/tarball/download/source/aws/1.2.0/module.tar.gz');
      }));

  it('should return 404 if given module does not exist', () =>
    request(app)
      .get('/v1/modules/download/source/aws/2.2.0/download')
      .expect('Content-Type', /application\/json/)
      .expect(404)
      .then((res) => {
        expect(res.body).to.have.property('errors').to.be.an('array');
      }));
});

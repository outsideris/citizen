const request = require('supertest');
const { expect } = require('chai');

const app = require('../../app');
const { db, save } = require('../../lib/store');
const { deleteDbAll } = require('../helper');

describe('GET /v1/modules', () => {
  before(async () => {
    await save({
      namespace: 'GCP', name: 'lb-http', provider: 'google', version: '1.0.4', owner: '',
    });
    await save({
      namespace: 'aws-modules', name: 'vpc', provider: 'aws', version: '1.2.1', owner: '',
    });
    await save({
      namespace: 'aws-modules', name: 'vpc', provider: 'aws', version: '1.5.0', owner: '',
    });
    await save({
      namespace: 'aws-modules', name: 'vpc', provider: 'aws', version: '1.5.1', owner: '',
    });
  });

  after(async () => {
    await deleteDbAll(db);
  });

  it('should return all modules', () =>
    request(app)
      .get('/v1/modules')
      .expect('Content-Type', /application\/json/)
      .expect(200)
      .then((res) => {
        expect(res.body).to.have.property('meta')
          .to.have.property('current_offset').to.equal(0);
        expect(res.body).to.have.property('modules').to.have.lengthOf(4);
      }));
});

describe('GET /v1/modules/:namespace', () => {
  before(async () => {
    await save({
      namespace: 'GCP', name: 'lb-http', provider: 'google', version: '1.0.4', owner: '',
    });
    await save({
      namespace: 'aws-modules', name: 'vpc', provider: 'aws', version: '1.2.1', owner: '',
    });
    await save({
      namespace: 'aws-modules', name: 'vpc', provider: 'aws', version: '1.5.0', owner: '',
    });
    await save({
      namespace: 'aws-modules', name: 'vpc', provider: 'aws', version: '1.5.1', owner: '',
    });
  });

  after(async () => {
    await deleteDbAll(db);
  });

  it('should return all modules of namespace', () =>
    request(app)
      .get('/v1/modules/aws-modules')
      .expect('Content-Type', /application\/json/)
      .expect(200)
      .then((res) => {
        expect(res.body).to.have.property('meta')
          .to.have.property('current_offset').to.equal(0);
        expect(res.body).to.have.property('modules').to.have.lengthOf(3);
      }));
});

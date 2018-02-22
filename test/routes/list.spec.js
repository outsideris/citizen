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

  it('should support pagination', () =>
    request(app)
      .get('/v1/modules?offset=0&limit=2')
      .expect('Content-Type', /application\/json/)
      .expect(200)
      .then((res) => {
        expect(res.body).to.have.property('modules').to.have.lengthOf(2);
      }));

  it('should return meta of pagination', () =>
    request(app)
      .get('/v1/modules?offset=1&limit=2')
      .expect('Content-Type', /application\/json/)
      .expect(200)
      .then((res) => {
        expect(res.body).to.have.property('meta');
        expect(res.body.meta).to.have.property('limit').to.equal(2);
        expect(res.body.meta).to.have.property('current_offset').to.equal(1);
        expect(res.body.meta).to.have.property('next_offset').to.equal(3);
      }));

  it('should not be next_offset when there is no more modules', () =>
    request(app)
      .get('/v1/modules?offset=2&limit=2')
      .expect('Content-Type', /application\/json/)
      .expect(200)
      .then((res) => {
        expect(res.body).to.have.property('meta');
        expect(res.body.meta).to.have.property('limit');
        expect(res.body.meta).to.have.property('current_offset');
        expect(res.body.meta).to.not.have.property('next_offset');
      }));
});

describe('GET /v1/modules/:namespace', () => {
  before(async () => {
    await save({
      namespace: 'GCP', name: 'lb-http', provider: 'google', version: '1.0.4', owner: '',
    });
    await save({
      namespace: 'aws-modules', name: 'vpc', provider: 'microsoft', version: '1.2.1', owner: '',
    });
    await save({
      namespace: 'aws-modules', name: 'vpc', provider: 'microsoft', version: '1.5.0', owner: '',
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

  it('should filter modules by provider', () =>
    request(app)
      .get('/v1/modules/aws-modules?provider=microsoft')
      .expect('Content-Type', /application\/json/)
      .expect(200)
      .then((res) => {
        expect(res.body).to.have.property('meta')
          .to.have.property('current_offset').to.equal(0);
        expect(res.body).to.have.property('modules').to.have.lengthOf(2);
      }));
});

describe('GET /v1/modules/search', () => {
  before(async () => {
    await save({
      namespace: 'GCP', name: 'lb-http', provider: 'google', version: '1.0.4', owner: '',
    });
    await save({
      namespace: 'aws-modules', name: 'vpc', provider: 'microsoft', version: '1.2.1', owner: '',
    });
    await save({
      namespace: 'aws-modules', name: 'vpc', provider: 'microsoft', version: '1.5.0', owner: '',
    });
    await save({
      namespace: 'aws-modules', name: 'vpc', provider: 'aws', version: '1.5.1', owner: '',
    });
  });

  after(async () => {
    await deleteDbAll(db);
  });

  it('should return all modules which matched by q', () =>
    request(app)
      .get('/v1/modules/search?q=vpc')
      .expect('Content-Type', /application\/json/)
      .expect(200)
      .then((res) => {
        expect(res.body).to.have.property('meta')
          .to.have.property('current_offset').to.equal(0);
        expect(res.body).to.have.property('modules').to.have.lengthOf(3);
      }));

  it('should return all modules which contain q', () =>
    request(app)
      .get('/v1/modules/search?q=pc')
      .expect('Content-Type', /application\/json/)
      .expect(200)
      .then((res) => {
        expect(res.body).to.have.property('meta')
          .to.have.property('current_offset').to.equal(0);
        expect(res.body).to.have.property('modules').to.have.lengthOf(3);
      }));

  it('should reject the request which does not have q parameter', () =>
    request(app)
      .get('/v1/modules/search')
      .expect('Content-Type', /application\/json/)
      .expect(400)
      .then((res) => {
        expect(res.body).to.have.property('errors');
      }));
});

describe('GET /v1/modules/:namespace/:name/:provider/versions', () => {
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

  it('should return available versions for a specific module', () =>
    request(app)
      .get('/v1/modules/aws-modules/vpc/aws/versions')
      .expect('Content-Type', /application\/json/)
      .expect(200)
      .then((res) => {
        expect(res.body).to.have.property('modules').to.have.lengthOf(1);
        expect(res.body.modules[0].versions).to.have.lengthOf(3);
        expect(res.body.modules[0]).to.have.property('versions').to.have.lengthOf(3);
      }));
});

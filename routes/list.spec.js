const request = require('supertest');
const { expect } = require('chai');

const app = require('../app');
const { moduleDb, saveModule } = require('../stores/store');
const { deleteDbAll } = require('../test/helper');

describe('GET /v1/modules', () => {
  before(async () => {
    await saveModule({
      namespace: 'GCP', name: 'lb-http', provider: 'google', version: '1.0.4', owner: '',
    });
    await saveModule({
      namespace: 'aws-modules', name: 'vpc', provider: 'aws', version: '1.2.1', owner: '',
    });
    await saveModule({
      namespace: 'aws-modules', name: 'vpc', provider: 'aws', version: '1.5.0', owner: '',
    });
    await saveModule({
      namespace: 'aws-modules', name: 'vpc', provider: 'aws', version: '1.5.1', owner: '',
    });
  });

  after(async () => {
    await deleteDbAll(moduleDb());
  });

  it('should return all modules', () => request(app)
    .get('/v1/modules')
    .expect('Content-Type', /application\/json/)
    .expect(200)
    .then((res) => {
      expect(res.body).to.have.property('meta')
        .to.have.property('current_offset').to.equal(0);
      expect(res.body).to.have.property('modules').to.have.lengthOf(4);
    }));

  it('should support pagination', () => request(app)
    .get('/v1/modules?offset=0&limit=2')
    .expect('Content-Type', /application\/json/)
    .expect(200)
    .then((res) => {
      expect(res.body).to.have.property('modules').to.have.lengthOf(2);
    }));

  it('should return meta of pagination', () => request(app)
    .get('/v1/modules?offset=1&limit=2')
    .expect('Content-Type', /application\/json/)
    .expect(200)
    .then((res) => {
      expect(res.body).to.have.property('meta');
      expect(res.body.meta).to.have.property('limit').to.equal(2);
      expect(res.body.meta).to.have.property('current_offset').to.equal(1);
      expect(res.body.meta).to.have.property('next_offset').to.equal(3);
      expect(res.body.meta).to.have.property('next_url').to.equal('/v1/modules/?limit=2&offset=3');
    }));

  it('should not be next_offset when there is no more modules', () => request(app)
    .get('/v1/modules?offset=2&limit=2')
    .expect('Content-Type', /application\/json/)
    .expect(200)
    .then((res) => {
      expect(res.body).to.have.property('meta');
      expect(res.body.meta).to.have.property('limit');
      expect(res.body.meta).to.have.property('current_offset');
      expect(res.body.meta).to.not.have.property('next_offset');
      expect(res.body.meta).to.not.have.property('next_url');
    }));
});

describe('GET /v1/modules/:namespace', () => {
  before(async () => {
    await saveModule({
      namespace: 'GCP', name: 'lb-http', provider: 'google', version: '1.0.4', owner: '',
    });
    await saveModule({
      namespace: 'aws-modules', name: 'vpc', provider: 'microsoft', version: '1.2.1', owner: '',
    });
    await saveModule({
      namespace: 'aws-modules', name: 'vpc', provider: 'microsoft', version: '1.5.0', owner: '',
    });
    await saveModule({
      namespace: 'aws-modules', name: 'vpc', provider: 'aws', version: '1.5.1', owner: '',
    });
  });

  after(async () => {
    await deleteDbAll(moduleDb());
  });

  it('should return all modules of namespace', () => request(app)
    .get('/v1/modules/aws-modules')
    .expect('Content-Type', /application\/json/)
    .expect(200)
    .then((res) => {
      expect(res.body).to.have.property('meta')
        .to.have.property('current_offset').to.equal(0);
      expect(res.body).to.have.property('modules').to.have.lengthOf(3);
    }));

  it('should filter modules by provider', () => request(app)
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
    await saveModule({
      namespace: 'GCP', name: 'lb-http', provider: 'google', version: '1.0.4', owner: '',
    });
    await saveModule({
      namespace: 'aws-modules', name: 'vpc', provider: 'microsoft', version: '1.2.1', owner: '',
    });
    await saveModule({
      namespace: 'aws-modules', name: 'vpc', provider: 'microsoft', version: '1.5.0', owner: '',
    });
    await saveModule({
      namespace: 'aws-modules', name: 'vpc', provider: 'aws', version: '1.5.1', owner: '',
    });
  });

  after(async () => {
    await deleteDbAll(moduleDb());
  });

  it('should return all modules which matched by q', () => request(app)
    .get('/v1/modules/search?q=vpc')
    .expect('Content-Type', /application\/json/)
    .expect(200)
    .then((res) => {
      expect(res.body).to.have.property('meta')
        .to.have.property('current_offset').to.equal(0);
      expect(res.body).to.have.property('modules').to.have.lengthOf(3);
    }));

  it('should return all modules which contain q', () => request(app)
    .get('/v1/modules/search?q=pc')
    .expect('Content-Type', /application\/json/)
    .expect(200)
    .then((res) => {
      expect(res.body).to.have.property('meta')
        .to.have.property('current_offset').to.equal(0);
      expect(res.body).to.have.property('modules').to.have.lengthOf(3);
    }));

  it('should reject the request which does not have q parameter', () => request(app)
    .get('/v1/modules/search')
    .expect('Content-Type', /application\/json/)
    .expect(400)
    .then((res) => {
      expect(res.body).to.have.property('errors');
    }));
});

describe('GET /v1/modules/:namespace/:name/:provider/versions', () => {
  before(async () => {
    await saveModule({
      namespace: 'GCP', name: 'lb-http', provider: 'google', version: '1.0.4', owner: '', definition: { root: { name: 'lb-http' }, submodules: [{ name: 'example' }] },
    });
    await saveModule({
      namespace: 'aws-modules', name: 'vpc', provider: 'aws', version: '1.2.1', owner: '', definition: { root: { name: 'vpc' }, submodules: [{ name: 'example' }] },
    });
    await saveModule({
      namespace: 'aws-modules', name: 'vpc', provider: 'aws', version: '1.5.0', owner: '', definition: { root: { name: 'vpc' }, submodules: [{ name: 'example' }] },
    });
    await saveModule({
      namespace: 'aws-modules', name: 'vpc', provider: 'aws', version: '1.5.1', owner: '', definition: { root: { name: 'vpc' }, submodules: [{ name: 'example' }] },
    });
  });

  after(async () => {
    await deleteDbAll(moduleDb());
  });

  it('should return available versions for a specific module', () => request(app)
    .get('/v1/modules/aws-modules/vpc/aws/versions')
    .expect('Content-Type', /application\/json/)
    .expect(200)
    .then((res) => {
      expect(res.body).to.have.property('modules').to.have.lengthOf(1);
      expect(res.body.modules[0].versions).to.have.lengthOf(3);
      expect(res.body.modules[0]).to.have.property('versions').to.have.lengthOf(3);
    }));

  it('should return root and submodules', () => request(app)
    .get('/v1/modules/aws-modules/vpc/aws/versions')
    .expect('Content-Type', /application\/json/)
    .expect(200)
    .then((res) => {
      const specificModule = res.body.modules[0].versions[0];
      expect(specificModule)
        .to.have.property('root')
        .to.have.property('name').to.equal('vpc');
      expect(specificModule)
        .to.have.property('submodules').to.have.lengthOf(1);
      expect(specificModule.submodules[0])
        .to.have.property('name').to.equal('example');
    }));
});

describe('GET /v1/modules/:namespace/:name', () => {
  before(async () => {
    await saveModule({
      namespace: 'hashicorp', name: 'consul', provider: 'azurerm', version: '0.1.0', owner: '',
    });
    await saveModule({
      namespace: 'hashicorp', name: 'consul', provider: 'azurerm', version: '0.2.0', owner: '',
    });
    await saveModule({
      namespace: 'hashicorp', name: 'consul', provider: 'aws', version: '1.1.1', owner: '',
    });
    await saveModule({
      namespace: 'hashicorp', name: 'consul', provider: 'aws', version: '1.1.2', owner: '',
    });
    await saveModule({
      namespace: 'hashicorp', name: 'consul', provider: 'google', version: '1.1.2', owner: '',
    });
  });

  after(async () => {
    await deleteDbAll(moduleDb());
  });

  it('should return all latest version of module for all providers', () => request(app)
    .get('/v1/modules/hashicorp/consul')
    .expect('Content-Type', /application\/json/)
    .expect(200)
    .then((res) => {
      expect(res.body).to.have.property('modules').to.have.lengthOf(3);
      expect(res.body.modules[0].provider).to.equal('azurerm');
      expect(res.body.modules[0].version).to.equal('0.2.0');
      expect(res.body.modules[1].provider).to.equal('aws');
      expect(res.body.modules[1].version).to.equal('1.1.2');
      expect(res.body.modules[2].provider).to.equal('google');
      expect(res.body.modules[2].version).to.equal('1.1.2');
    }));

  it('should support pagination', () => request(app)
    .get('/v1/modules/hashicorp/consul?offset=1&limit=1')
    .expect('Content-Type', /application\/json/)
    .expect(200)
    .then((res) => {
      expect(res.body).to.have.property('meta');
      expect(res.body.meta).to.have.property('limit').to.equal(1);
      expect(res.body.meta).to.have.property('current_offset').to.equal(1);
      expect(res.body.meta).to.have.property('next_offset').to.equal(2);
      expect(res.body.meta).to.have.property('next_url').to.equal('/v1/modules/hashicorp/consul?limit=1&offset=2');
      expect(res.body).to.have.property('modules').to.have.lengthOf(1);
    }));
});

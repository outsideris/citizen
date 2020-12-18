const request = require('supertest');
const { expect } = require('chai');
const { promisify } = require('util');
const rimraf = promisify(require('rimraf'));
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');

const app = require('../app');
const { deleteDbAll } = require('../test/helper');
const { db, save } = require('../lib/providers-store');

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);

describe('POST /v1/providers/:namespace/:type/:version', () => {
  let providerBuf;
  let providerPath;

  const tarballPath = path.join(__dirname, '../test', 'fixture/test.tar.gz');

  beforeEach(async () => {
    providerPath = 'hashicorp/consul/1.0.0';
  });

  afterEach(async () => {
    await deleteDbAll(db);
    await rimraf(process.env.CITIZEN_STORAGE_PATH);
  });

  it('should register new provider', () => request(app)
    .post(`/v1/providers/${providerPath}`)
    .attach('provider', 'test/fixture/provider/terraform-provider-null_1.0.0_linux_amd64.zip')
    .attach('provider', 'test/fixture/provider/terraform-provider-null_1.0.0_windows_amd64.zip')
    .attach('sha256sums', 'test/fixture/provider/terraform-provider-null_1.0.0_SHA256SUMS')
    .attach('signature', 'test/fixture/provider/terraform-provider-null_1.0.0_SHA256SUMS.sig')
    .field('os', ['linux', 'windows'])
    .field('arch', ['amd64', 'amd64'])
    .expect('Content-Type', /application\/json/)
    .expect(201)
    .then((res) => {
      expect(res.body).to.have.property('platforms').to.be.an('array').to.have.lengthOf(2);
      expect(res.body.platforms[0]).to.have.property('os').to.equal('linux');
      expect(res.body.platforms[0]).to.have.property('arch').to.equal('amd64');
      expect(res.body.platforms[1]).to.have.property('os').to.equal('windows');
      expect(res.body.platforms[1]).to.have.property('arch').to.equal('amd64');
    }));

  it('should reject if os/arch fields do not match files', () => request(app)
    .post(`/v1/providers/${providerPath}`)
    .attach('provider', 'test/fixture/provider/terraform-provider-null_1.0.0_linux_amd64.zip')
    .attach('provider', 'test/fixture/provider/terraform-provider-null_1.0.0_windows_amd64.zip')
    .attach('sha256sums', 'test/fixture/provider/terraform-provider-null_1.0.0_SHA256SUMS')
    .attach('signature', 'test/fixture/provider/terraform-provider-null_1.0.0_SHA256SUMS.sig')
    .field('os', ['windows', 'linux'])
    .field('arch', ['amd64', 'amd64'])
    .expect('Content-Type', /application\/json/)
    .expect(400)
    .then((res) => {
      expect(res.body).to.have.property('error');
      expect(res.body.error).to.contain('OS/Arch');
    }));

  it('should return error if no files attached', () => request(app)
    .post(`/v1/providers/${providerPath}`)
    .field('name', 'nothing')
    .expect('Content-Type', /application\/json/)
    .expect(400)
    .then((res) => {
      expect(res.body).to.have.property('error').to.be.an('string');
      expect(res.body.error).to.contain('no files attached');
    }));

  it('should return error if no sums file attached', () => request(app)
    .post(`/v1/providers/${providerPath}`)
    .attach('provider', 'test/fixture/provider/terraform-provider-null_1.0.0_linux_amd64.zip')
    .expect('Content-Type', /application\/json/)
    .expect(400)
    .then((res) => {
      expect(res.body).to.have.property('error').to.be.an('string');
      expect(res.body.error).to.contain('no sums file attached');
    }));

  it('should return error if no signature file attached', () => request(app)
    .post(`/v1/providers/${providerPath}`)
    .attach('provider', 'test/fixture/provider/terraform-provider-null_1.0.0_linux_amd64.zip')
    .attach('sha256sums', 'test/fixture/provider/terraform-provider-null_1.0.0_SHA256SUMS')
    .expect('Content-Type', /application\/json/)
    .expect(400)
    .then((res) => {
      expect(res.body).to.have.property('error').to.be.an('string');
      expect(res.body.error).to.contain('no signature file attached');
    }));

  it('should reject if os/arch not specified', () => request(app)
    .post(`/v1/providers/${providerPath}`)
    .attach('provider', 'test/fixture/provider/terraform-provider-null_1.0.0_linux_amd64.zip')
    .attach('provider', 'test/fixture/provider/terraform-provider-null_1.0.0_windows_amd64.zip')
    .attach('sha256sums', 'test/fixture/provider/terraform-provider-null_1.0.0_SHA256SUMS')
    .attach('signature', 'test/fixture/provider/terraform-provider-null_1.0.0_SHA256SUMS.sig')
    .expect('Content-Type', /application\/json/)
    .expect(400)
    .then((res) => {
      expect(res.body).to.have.property('error');
      expect(res.body.error).to.contain('os/arch');
    }));

  it.skip('should reject the request if the provider is already exists.', async () => {
    const pathToStore = path.join(process.env.CITIZEN_STORAGE_PATH, `${providerPath}/test.tar.gz`);
    const parsedPath = path.parse(pathToStore);
    await mkdirp(parsedPath.dir);
    providerBuf = await readFile(tarballPath);
    await writeFile(pathToStore, providerBuf);

    return request(app)
      .post(`/v1/providers/${providerPath}`)
      .attach('provider', 'test/fixture/test.tar.gz')
      .expect('Content-Type', /application\/json/)
      .expect(409)
      .then((res) => {
        expect(res.body).to.have.property('errors').to.be.an('array');
      });
  });

  it.skip('should register provider information', (done) => {
    request(app)
      .post(`/v1/providers/${providerPath}`)
      .attach('provider', 'test/fixture/complex.tar.gz')
      .expect('Content-Type', /application\/json/)
      .expect(201)
      .then((res) => {
        db.find({
          namespace: res.body.providers[0].namespace,
          name: res.body.providers[0].name,
          provider: res.body.providers[0].provider,
          version: res.body.providers[0].version,
        }, (err, docs) => {
          if (err) { return done(err); }

          expect(docs[0]).to.have.property('root');
          expect(docs[0].root).to.have.property('name').to.equal('consul');
          expect(docs[0]).to.have.property('subproviders').to.be.an.instanceof(Array);
          expect(docs[0].subproviders).to.have.lengthOf(3);
          return done();
        });
      });
  });
});

describe.skip('GET /v1/providers/:namespace/:type//versions', () => {
  before(async () => {
    await save({
      namespace: 'router', name: 'specific', version: '1.1.2',
    });
  });

  after(async () => {
    await deleteDbAll(db);
  });

  it('should return provider versions', () => request(app)
    .get('/v1/providers/router/specific/versions')
    .expect('Content-Type', /application\/json/)
    .expect(200)
    .then((res) => {
      expect(res.body).to.have.property('id').to.equal('router/specific/aws/1.1.2');
      expect(res.body).to.have.property('version').to.equal('1.1.2');
    }));

  it('should return 404 if given provider does not exist', () => request(app)
    .get('/v1/providers/router/specific/2.1.2/download/windows/amd64')
    .expect('Content-Type', /application\/json/)
    .expect(404));
});

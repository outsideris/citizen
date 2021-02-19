const request = require('supertest');
const { expect } = require('chai');
const { promisify } = require('util');
const rimraf = promisify(require('rimraf'));
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');

const app = require('../app');
const { deleteDbAll } = require('../test/helper');
const { providerDb, saveProvider } = require('../stores/store');

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);

describe('POST /v1/providers/:namespace/:type/:version', () => {
  let providerBuf;
  let providerPath;

  beforeEach(async () => {
    providerPath = 'citizen-test/null/1.0.0';
  });

  afterEach(async () => {
    await deleteDbAll(providerDb());
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

  it('should reject the request if the provider already exists.', async () => {
    const pathToStore = path.join(process.env.CITIZEN_STORAGE_PATH, `providers/${providerPath}/terraform-provider-null_1.0.0_linux_amd64.zip`);
    const parsedPath = path.parse(pathToStore);
    await mkdirp(parsedPath.dir);
    providerBuf = await readFile('test/fixture/provider/terraform-provider-null_1.0.0_linux_amd64.zip');
    await writeFile(pathToStore, providerBuf);

    return request(app)
      .post(`/v1/providers/${providerPath}`)
      .attach('provider', 'test/fixture/provider/terraform-provider-null_1.0.0_linux_amd64.zip')
      .attach('sha256sums', 'test/fixture/provider/terraform-provider-null_1.0.0_SHA256SUMS')
      .attach('signature', 'test/fixture/provider/terraform-provider-null_1.0.0_SHA256SUMS.sig')
      .field('os', ['linux'])
      .field('arch', ['amd64'])
      .expect('Content-Type', /application\/json/)
      .expect(409)
      .then((res) => {
        expect(res.body).to.have.property('error');
        expect(res.body.error).to.contain('Provider already exists');
      });
  });
});

describe('GET /v1/providers/:namespace/:type/versions', () => {
  before(async () => {
    await saveProvider({
      namespace: 'citizen-test', type: 'null', version: '1.1.2', platforms: [{ os: 'windows', arch: 'amd64' }],
    });
    await saveProvider({
      namespace: 'citizen-test', type: 'null', version: '1.1.3', platforms: [{ os: 'windows', arch: 'amd64' }],
    });
  });

  after(async () => {
    await deleteDbAll(providerDb());
  });

  it('should return provider versions', () => request(app)
    .get('/v1/providers/citizen-test/null/versions')
    .expect('Content-Type', /application\/json/)
    .expect(200)
    .then((res) => {
      expect(res.body).to.have.property('versions');
      expect(res.body.versions[0]).to.have.property('version').to.equal('1.1.2');
      expect(res.body.versions[1]).to.have.property('version').to.equal('1.1.3');
    }));

  it('should return 404 if given provider does not exist', () => request(app)
    .get('/v1/providers/citizen-test/null/2.1.2/download/windows/amd64')
    .expect('Content-Type', /application\/json/)
    .expect(404));
});

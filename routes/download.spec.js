const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');
const { expect } = require('chai');
const { rimraf } = require('rimraf');

const app = require('../app');
const helper = require('../test/helper');
const { getClient, saveModule, findOneModule } = require('../stores/store');

describe('GET /v1/modules/:namespace/:name/:provider/:version/download', () => {
  before(async () => {
    await saveModule({
      namespace: 'download',
      name: 'source',
      provider: 'aws',
      version: '1.2.0',
      location: 'download/source/aws/1.2.0/module.tar.gz',
    });
  });

  after(async () => {
    await helper.deleteDbAll(getClient());
  });

  it('should return the location which client can download source code', () =>
    request(app)
      .get('/v1/modules/download/source/aws/1.2.0/download')
      .expect(204)
      .then((res) => {
        expect(res.headers)
          .to.have.property('x-terraform-get')
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

describe('GET /v1/modules/:namespace/:name/:provider/download', () => {
  before(async () => {
    await saveModule({
      namespace: 'download',
      name: 'source',
      provider: 'aws',
      version: '1.2.0',
      location: 'download/source/aws/1.2.0/module.tar.gz',
    });
    await saveModule({
      namespace: 'download',
      name: 'source',
      provider: 'aws',
      version: '1.3.0',
      location: 'download/source/aws/1.3.0/module.tar.gz',
    });
  });

  after(async () => {
    await helper.deleteDbAll(getClient());
  });

  it('should redirect to the latest version of a module', () =>
    request(app)
      .get('/v1/modules/download/source/aws/download')
      .expect(302)
      .then((res) => {
        expect(res.headers).to.have.property('location').to.equal('/v1/modules/download/source/aws/1.3.0/download');
      }));
});

describe('GET /v1/modules/tarball/:namespace/:name/:provider/*.tar.gz', () => {
  const version = new Date().getTime();
  const modulePath = `download/tar/aws/${version}`;

  beforeEach(async () => {
    await request(app).post(`/v1/modules/${modulePath}`).attach('module', 'test/fixture/module.tar.gz').expect(201);
  });

  afterEach(async () => {
    await helper.deleteDbAll(getClient());
    await rimraf(process.env.CITIZEN_STORAGE_PATH);
  });

  it('should download a tarball for a specific module', () => {
    const targetFile = fs.readFileSync(path.join(__dirname, '..', 'test', 'fixture', 'module.tar.gz'));
    const contentLength = `${targetFile.length}`;

    return request(app)
      .get(`/v1/modules/tarball/download/tar/aws/${version}/module.tar.gz`)
      .expect(200)
      .then((res) => {
        expect(res.headers).to.have.property('content-disposition');
        expect(res.headers).to.have.property('content-length').to.equal(contentLength);
      });
  });

  it('should increase download count for a specific module', () =>
    request(app)
      .get(`/v1/modules/tarball/download/tar/aws/${version}/module.tar.gz`)
      .expect(200)
      .then(async () => {
        const module = await findOneModule({
          namespace: 'download',
          name: 'tar',
          provider: 'aws',
          version: `${version}`,
        });
        expect(module).to.have.property('downloads').to.equal(1);
      })
      .catch((err) => {
        throw err;
      }));
});

const { writeFile, readFile } = require('node:fs/promises');
const path = require('node:path');
const request = require('supertest');
const { expect } = require('chai');
const { rimraf } = require('rimraf');
const { mkdirp } = require('mkdirp');

const app = require('../app');
const helper = require('../test/helper');
const { getClient, saveModule, findOneModule } = require('../stores/store');

describe('POST /v1/modules/:namespace/:name/:provider/:version', () => {
  let moduleBuf;
  let modulePath;
  const tarballPath = path.join(__dirname, '..', 'test', 'fixture', 'module.tar.gz');

  beforeEach(async () => {
    modulePath = `hashicorp/consul/aws/${new Date().getTime()}`;
  });

  afterEach(async () => {
    await helper.deleteDbAll(getClient());
    await rimraf(process.env.CITIZEN_STORAGE_PATH);
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

  it('should reject the request if the module is already exists.', async () => {
    const pathToStore = path.join(process.env.CITIZEN_STORAGE_PATH, 'modules', `${modulePath}/module.tar.gz`);
    const parsedPath = path.parse(pathToStore);
    await mkdirp(parsedPath.dir);
    moduleBuf = await readFile(tarballPath);
    await writeFile(pathToStore, moduleBuf);

    return request(app)
      .post(`/v1/modules/${modulePath}`)
      .attach('module', 'test/fixture/module.tar.gz')
      .expect('Content-Type', /application\/json/)
      .expect(409)
      .then((res) => {
        expect(res.body).to.have.property('errors').to.be.an('array');
      });
  });

  it('should register new module with owner information', () =>
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

  it('should register module information', () =>
    request(app)
      .post(`/v1/modules/${modulePath}`)
      .attach('module', 'test/fixture/complex.tar.gz')
      .expect('Content-Type', /application\/json/)
      .expect(201)
      .then(async (res) => {
        const module = await findOneModule({
          namespace: res.body.modules[0].namespace,
          name: res.body.modules[0].name,
          provider: res.body.modules[0].provider,
          version: res.body.modules[0].version,
        });

        expect(module).to.have.property('root');
        expect(module).to.have.property('submodules').to.be.an.instanceof(Array);
        expect(module.root).to.have.property('name').to.equal('consul');
        expect(module.root).to.have.property('outputs').to.have.property('side_effect_alb_dns');
        expect(module.root).to.have.property('module_calls').to.have.property('ecs_service_well_known');
      })
      .catch((err) => {
        throw err;
      }));
});

describe('GET /v1/modules/:namespace/:name/:provider/:version', () => {
  before(async () => {
    await saveModule({
      namespace: 'router',
      name: 'specific',
      provider: 'aws',
      version: '1.1.2',
      owner: '',
    });
  });

  after(async () => {
    await helper.deleteDbAll(getClient());
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
    await saveModule({
      namespace: 'router',
      name: 'latest',
      provider: 'aws',
      version: '1.1.1',
      owner: '',
      definition: { root: { name: 'latest' }, submodules: [{ name: 'example' }] },
    });
    await saveModule({
      namespace: 'router',
      name: 'latest',
      provider: 'aws',
      version: '1.1.2',
      owner: '',
      definition: { root: { name: 'latest' }, submodules: [{ name: 'example' }] },
    });
  });

  after(async () => {
    await helper.deleteDbAll(getClient());
  });

  it('should return latest version for a specific module provider', () =>
    request(app)
      .get('/v1/modules/router/latest/aws')
      .expect('Content-Type', /application\/json/)
      .expect(200)
      .then((res) => {
        expect(res.body).to.have.property('version').to.equal('1.1.2');
        expect(res.body).to.have.property('root').to.have.property('name').to.equal('latest');
        expect(res.body.submodules[0]).to.have.property('name').to.equal('example');
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

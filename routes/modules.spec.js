const request = require('supertest');
const { expect } = require('chai');
const { promisify } = require('util');
const rimraf = promisify(require('rimraf'));
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');

const app = require('../app');
const { deleteDbAll } = require('../test/helper');
const { db, save } = require('../lib/modules-store');

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);

describe('Terraform 0.12 support', () => {
  describe('POST /v1/modules/:namespace/:name/:provider/:version', () => {
    let modulePath;

    beforeEach(async () => {
      modulePath = `hashicorp/consul/aws/${(new Date()).getTime()}`;
    });

    afterEach(async () => {
      await deleteDbAll(db);
      await rimraf(process.env.CITIZEN_STORAGE_PATH);
    });

    it('should register new v12 module', () => request(app)
      .post(`/v1/modules/${modulePath}`)
      .attach('module', 'test/fixture/module.v12.tar.gz')
      .expect('Content-Type', /application\/json/)
      .expect(201)
      .then((res) => {
        expect(res.body).to.have.property('modules').to.be.an('array');
        expect(res.body.modules[0]).to.have.property('id').to.equal(modulePath);
      }));
  });
});

describe('POST /v1/modules/:namespace/:name/:provider/:version', () => {
  let moduleBuf;
  let modulePath;
  const tarballPath = path.join(__dirname, '../test', 'fixture/test.tar.gz');

  beforeEach(async () => {
    modulePath = `hashicorp/consul/aws/${(new Date()).getTime()}`;
  });

  afterEach(async () => {
    await deleteDbAll(db);
    await rimraf(process.env.CITIZEN_STORAGE_PATH);
  });

  it('should register new module', () => request(app)
    .post(`/v1/modules/${modulePath}`)
    .attach('module', 'test/fixture/module.tar.gz')
    .expect('Content-Type', /application\/json/)
    .expect(201)
    .then((res) => {
      expect(res.body).to.have.property('modules').to.be.an('array');
      expect(res.body.modules[0]).to.have.property('id').to.equal(modulePath);
    }));

  it('should reject the request if the module is already exists.', async () => {
    const pathToStore = path.join(process.env.CITIZEN_STORAGE_PATH, 'modules', `${modulePath}/test.tar.gz`);
    const parsedPath = path.parse(pathToStore);
    await mkdirp(parsedPath.dir);
    moduleBuf = await readFile(tarballPath);
    await writeFile(pathToStore, moduleBuf);

    return request(app)
      .post(`/v1/modules/${modulePath}`)
      .attach('module', 'test/fixture/test.tar.gz')
      .expect('Content-Type', /application\/json/)
      .expect(409)
      .then((res) => {
        expect(res.body).to.have.property('errors').to.be.an('array');
      });
  });

  it('should register new module with owner infomation', () => request(app)
    .post(`/v1/modules/${modulePath}`)
    .field('owner', 'outsideris')
    .attach('module', 'test/fixture/module.tar.gz')
    .expect('Content-Type', /application\/json/)
    .expect(201)
    .then((res) => {
      expect(res.body).to.have.property('modules').to.be.an('array');
      expect(res.body.modules[0]).to.have.property('id').to.equal(modulePath);
    }));

  it('should register module information', (done) => {
    request(app)
      .post(`/v1/modules/${modulePath}`)
      .attach('module', 'test/fixture/complex.tar.gz')
      .expect('Content-Type', /application\/json/)
      .expect(201)
      .then((res) => {
        db.find({
          namespace: res.body.modules[0].namespace,
          name: res.body.modules[0].name,
          provider: res.body.modules[0].provider,
          version: res.body.modules[0].version,
        }, (err, docs) => {
          if (err) { return done(err); }

          expect(docs[0]).to.have.property('root');
          expect(docs[0].root).to.have.property('name').to.equal('consul');
          expect(docs[0]).to.have.property('submodules').to.be.an.instanceof(Array);
          expect(docs[0].submodules).to.have.lengthOf(3);
          return done();
        });
      });
  });
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

  it('should return a specific module', () => request(app)
    .get('/v1/modules/router/specific/aws/1.1.2')
    .expect('Content-Type', /application\/json/)
    .expect(200)
    .then((res) => {
      expect(res.body).to.have.property('id').to.equal('router/specific/aws/1.1.2');
      expect(res.body).to.have.property('version').to.equal('1.1.2');
    }));

  it('should return 404 if given module does not exist', () => request(app)
    .get('/v1/modules/router/specific/aws/2.1.2')
    .expect('Content-Type', /application\/json/)
    .expect(404));
});

describe('GET /v1/modules/:namespace/:name/:provider', () => {
  before(async () => {
    await save({
      namespace: 'router', name: 'latest', provider: 'aws', version: '1.1.1', owner: '', definition: { root: { name: 'latest' }, submodules: [{ name: 'example' }] },
    });
    await save({
      namespace: 'router', name: 'latest', provider: 'aws', version: '1.1.2', owner: '', definition: { root: { name: 'latest' }, submodules: [{ name: 'example' }] },
    });
  });

  after(async () => {
    await deleteDbAll(db);
  });

  it('should return latest version for a specific module provider', () => request(app)
    .get('/v1/modules/router/latest/aws')
    .expect('Content-Type', /application\/json/)
    .expect(200)
    .then((res) => {
      expect(res.body).to.have.property('version').to.equal('1.1.2');
      expect(res.body).to.have.property('root').to.have.property('name').to.equal('latest');
      expect(res.body.submodules[0]).to.have.property('name').to.equal('example');
    }));

  it('should return 404 if given module does not exist', () => request(app)
    .get('/v1/modules/router/latest/nomodule')
    .expect('Content-Type', /application\/json/)
    .expect(404)
    .then((res) => {
      expect(res.body).to.have.property('errors').to.be.an('array');
    }));
});

const request = require('supertest');
const got = require('got');
const { expect } = require('chai');
const { promisify } = require('util');
const rimraf = promisify(require('rimraf'));
const unzipper = require('unzipper');

const app = require('../app');
const { deleteDbAll, generateProvider } = require('../test/helper');
const { providerDb, saveProvider } = require('../stores/store');

describe('POST /v1/providers/:namespace/:type/:version', () => {
  let providerPath;
  let targetDir;
  let cleanupProvider;
  let providerData;

  beforeEach(async () => {
    providerData = {
      namespace: 'citizen',
      type: 'null',
      version: '1.0.0',
      protocols: ['4.1', '5.0'],
      platforms: [
        {
          filename: 'citizen-null_1.0.0_linux_amd64.zip',
          os: 'linux',
          arch: 'amd64',
        },
        {
          filename: 'citizen-null_1.0.0_windows_amd64.zip',
          os: 'windows',
          arch: 'amd64',
        },
      ],
    };
    providerPath = 'citizen/null/1.0.0';
    const result = await generateProvider('citizen-null_1.0.0', ['linux_amd64', 'windows_amd64']);
    [targetDir, cleanupProvider] = result;
  });

  afterEach(async () => {
    cleanupProvider();
    await deleteDbAll(providerDb());
    await rimraf(process.env.CITIZEN_STORAGE_PATH);
  });

  it('should register new provider', () => request(app)
    .post(`/v1/providers/${providerPath}`)
    .attach('file1', `${targetDir}/citizen-null_1.0.0_linux_amd64.zip`)
    .attach('file2', `${targetDir}/citizen-null_1.0.0_windows_amd64.zip`)
    .attach('file3', `${targetDir}/citizen-null_1.0.0_SHA256SUMS`)
    .attach('file4', `${targetDir}/citizen-null_1.0.0_SHA256SUMS.sig`)
    .field('data', JSON.stringify(providerData))
    .expect('Content-Type', /application\/json/)
    .expect(201)
    .then((res) => {
      expect(res.body).to.have.property('namespace').to.equal('citizen');
      expect(res.body).to.have.property('type').to.equal('null');
      expect(res.body).to.have.property('version').to.equal('1.0.0');
      expect(res.body).to.have.property('platforms').to.be.an('array').to.have.lengthOf(2);
      expect(res.body.platforms[0]).to.have.property('os').to.equal('linux');
      expect(res.body.platforms[0]).to.have.property('arch').to.equal('amd64');
      expect(res.body.platforms[1]).to.have.property('os').to.equal('windows');
      expect(res.body.platforms[1]).to.have.property('arch').to.equal('amd64');
    }));

  it('should return error if no files attached', () => request(app)
    .post(`/v1/providers/${providerPath}`)
    .field('data', JSON.stringify(providerData))
    .expect('Content-Type', /application\/json/)
    .expect(400)
    .then((res) => {
      expect(res.body).to.have.property('errors');
      expect(res.body.errors[0]).to.contain('at least three files');
    }));

  it('should return error if no sums file attached', () => request(app)
    .post(`/v1/providers/${providerPath}`)
    .attach('file1', `${targetDir}/citizen-null_1.0.0_linux_amd64.zip`)
    .attach('file2', `${targetDir}/citizen-null_1.0.0_windows_amd64.zip`)
    .attach('file3', `${targetDir}/citizen-null_1.0.0_SHA256SUMS.sig`)
    .field('data', JSON.stringify(providerData))
    .expect('Content-Type', /application\/json/)
    .expect(400)
    .then((res) => {
      expect(res.body).to.have.property('errors');
      expect(res.body.errors[0]).to.contain('no SHA 256 SUMS');
    }));

  it('should return error if no signature file attached', () => request(app)
    .post(`/v1/providers/${providerPath}`)
    .attach('file1', `${targetDir}/citizen-null_1.0.0_linux_amd64.zip`)
    .attach('file2', `${targetDir}/citizen-null_1.0.0_windows_amd64.zip`)
    .attach('file3', `${targetDir}/citizen-null_1.0.0_SHA256SUMS`)
    .field('data', JSON.stringify(providerData))
    .expect('Content-Type', /application\/json/)
    .expect(400)
    .then((res) => {
      expect(res.body).to.have.property('errors');
      expect(res.body.errors[0]).to.contain('no signature file');
    }));

  it('should reject if os/arch fields do not match files', () => {
    const data = { ...providerData };
    data.platforms[0].os = 'darwin';

    return request(app)
      .post(`/v1/providers/${providerPath}`)
      .attach('file1', `${targetDir}/citizen-null_1.0.0_linux_amd64.zip`)
      .attach('file2', `${targetDir}/citizen-null_1.0.0_windows_amd64.zip`)
      .attach('file3', `${targetDir}/citizen-null_1.0.0_SHA256SUMS`)
      .attach('file4', `${targetDir}/citizen-null_1.0.0_SHA256SUMS.sig`)
      .field('data', JSON.stringify(data))
      .expect('Content-Type', /application\/json/)
      .expect(400)
      .then((res) => {
        expect(res.body).to.have.property('errors');
        expect(res.body.errors[0]).to.contain('os/arch');
      });
  });

  it('should reject the request if the provider already exists', async () => {
    await saveProvider({
      namespace: 'citizen', type: 'null', version: '1.0.0', platforms: [{ os: 'windows', arch: 'amd64' }],
    });

    return request(app)
      .post(`/v1/providers/${providerPath}`)
      .attach('file1', `${targetDir}/citizen-null_1.0.0_linux_amd64.zip`)
      .attach('file2', `${targetDir}/citizen-null_1.0.0_windows_amd64.zip`)
      .attach('file3', `${targetDir}/citizen-null_1.0.0_SHA256SUMS`)
      .attach('file4', `${targetDir}/citizen-null_1.0.0_SHA256SUMS.sig`)
      .field('data', JSON.stringify(providerData))
      .expect('Content-Type', /application\/json/)
      .expect(409)
      .then((res) => {
        expect(res.body).to.have.property('errors');
        expect(res.body.errors[0]).to.contain('different provider with namespace, type or version');
      });
  });
});

describe('GET /v1/providers/:namespace/:type/versions', () => {
  before(async () => {
    await saveProvider({
      namespace: 'citizen-test', type: 'null', version: '1.1.2', protocols: ['4.1'], platforms: [{ os: 'windows', arch: 'amd64' }],
    });
    await saveProvider({
      namespace: 'citizen-test', type: 'null', version: '1.1.3', protocols: ['5.0'], platforms: [{ os: 'windows', arch: 'amd64' }],
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

describe('GET /v1/providers/:namespace/:type/:version/download/:os/:arch', () => {
  let targetDir;
  let cleanupProvider;
  let providerData;

  before(async () => {
    providerData = {
      namespace: 'citizen',
      type: 'null',
      version: '1.0.0',
      protocols: ['4.1', '5.0'],
      platforms: [
        {
          filename: 'citizen-null_1.0.0_linux_amd64.zip',
          os: 'linux',
          arch: 'amd64',
        },
        {
          filename: 'citizen-null_1.0.0_windows_amd64.zip',
          os: 'windows',
          arch: 'amd64',
        },
      ],
    };
    const providerPath = 'citizen/null/1.0.0';
    const result = await generateProvider('citizen-null_1.0.0', ['linux_amd64', 'windows_amd64']);
    [targetDir, cleanupProvider] = result;

    return request(app)
      .post(`/v1/providers/${providerPath}`)
      .attach('file1', `${targetDir}/citizen-null_1.0.0_linux_amd64.zip`)
      .attach('file2', `${targetDir}/citizen-null_1.0.0_windows_amd64.zip`)
      .attach('file3', `${targetDir}/citizen-null_1.0.0_SHA256SUMS`)
      .attach('file4', `${targetDir}/citizen-null_1.0.0_SHA256SUMS.sig`)
      .field('data', JSON.stringify(providerData))
      .expect('Content-Type', /application\/json/)
      .expect(201);
  });

  after(async () => {
    cleanupProvider();
    await deleteDbAll(providerDb());
    await rimraf(process.env.CITIZEN_STORAGE_PATH);
  });

  it('should return the provider package info', () => request(app)
    .get('/v1/providers/citizen/null/1.0.0/download/linux/amd64')
    .expect('Content-Type', /application\/json/)
    .expect(200)
    .then((res) => {
      expect(res.body).to.have.property('os').to.equal('linux');
      expect(res.body).to.have.property('arch').to.equal('amd64');
      expect(res.body).to.have.property('protocols').to.include('4.1');
      expect(res.body).to.have.property('protocols').to.include('5.0');
      expect(res.body).to.have.property('filename').to.equal('citizen-null_1.0.0_linux_amd64.zip');
      expect(res.body).to.have.property('download_url');
      expect(res.body).to.have.property('shasums_url');
      expect(res.body).to.have.property('shasums_signature_url');
      expect(res.body).to.have.property('shasum');
    }));

  describe('GET /:namespace/:type/:version/download/:os/:arch/zip', () => {
    it('should return downloadable download_url for provider', () => {
      const server = request(app);
      return server
        .get('/v1/providers/citizen/null/1.0.0/download/linux/amd64')
        .expect('Content-Type', /application\/json/)
        .expect(200)
        .then((res) => res.body.download_url)
        .then(async (downloadUrl) => {
          await server
            .get(downloadUrl)
            .expect('Content-Type', /application\/zip/)
            .expect('Content-Disposition', /citizen-null_1\.0\.0_linux_amd64\.zip/)
            .expect(200);

          const host = await server.get('/').url;
          const downloadedFile = await got(`${host.substr(0, host.length - 1)}${downloadUrl}`).buffer();

          const directory = await unzipper.Open.buffer(downloadedFile);
          const file = directory.files.find((f) => f.path === 'terraform-provider-null_1.0.0');
          const content = await file.buffer();
          expect(content.toString('utf8')).to.include('echo provider');
        });
    });

    it('should return downloadable download_url with protocols headers', () => {
      const server = request(app);
      return server
        .get('/v1/providers/citizen/null/1.0.0/download/linux/amd64')
        .expect('Content-Type', /application\/json/)
        .expect(200)
        .then((res) => res.body.download_url)
        .then((downloadUrl) => server
          .get(downloadUrl)
          .expect('x-terraform-protocol-version', '4')
          .expect('x-terraform-protocol-versions', '4.1, 5.0'));
    });

    it('should return 404 if download_url is unavailable', () => request(app)
      .get('/v1/providers/citizen/null/2.0.0/download/linux/amd64/zip')
      .expect('Content-Type', /application\/json/)
      .expect(404));
  });

  describe('GET /:namespace/:type/:version/sha256sums', () => {
    it('should return downloadable shasums_url for provider', () => {
      const server = request(app);
      return server
        .get('/v1/providers/citizen/null/1.0.0/download/linux/amd64')
        .expect('Content-Type', /application\/json/)
        .expect(200)
        .then((res) => res.body.shasums_url)
        .then((shasumsUrl) => server
          .get(shasumsUrl)
          .expect('Content-Type', /text\/plain/)
          .expect(200)
          .then((res) => {
            expect(res.text).to.include('citizen-null_1.0.0_linux_amd64.zip');
            expect(res.text).to.include('citizen-null_1.0.0_windows_amd64.zip');
          }));
    });

    it('should return downloadable shasums_url with protocols headers', () => {
      const server = request(app);
      return server
        .get('/v1/providers/citizen/null/1.0.0/download/linux/amd64')
        .expect('Content-Type', /application\/json/)
        .expect(200)
        .then((res) => res.body.shasums_url)
        .then((shasumsUrl) => server
          .get(shasumsUrl)
          .expect('x-terraform-protocol-version', '4')
          .expect('x-terraform-protocol-versions', '4.1, 5.0'));
    });

    it('should return 404 if shasums_url is unavailable', () => request(app)
      .get('/v1/providers/citizen/null/2.0.0/sha256sums')
      .expect('Content-Type', /application\/json/)
      .expect(404));
  });

  describe('GET /:namespace/:type/:version/sha256sums.sig', () => {
    it('should return downloadable shasums_signature_url for provider', () => {
      const server = request(app);
      return server
        .get('/v1/providers/citizen/null/1.0.0/download/linux/amd64')
        .expect('Content-Type', /application\/json/)
        .expect(200)
        .then((res) => res.body.shasums_signature_url)
        .then((shaSumsSignatureUrl) => server
          .get(shaSumsSignatureUrl)
          .expect('Content-Type', /application\/octet-stream/)
          .expect(200)
          .then((res) => {
            expect(res).to.have.property('body').to.be.an.instanceof(Buffer);
          }));
    });

    it('should return downloadable shasums_signature_url with protocols headers', () => {
      const server = request(app);
      return server
        .get('/v1/providers/citizen/null/1.0.0/download/linux/amd64')
        .expect('Content-Type', /application\/json/)
        .expect(200)
        .then((res) => res.body.shasums_url)
        .then((shaSumsSignatureUrl) => server
          .get(shaSumsSignatureUrl)
          .expect('x-terraform-protocol-version', '4')
          .expect('x-terraform-protocol-versions', '4.1, 5.0'));
    });

    it('should return 404 if shasums_signature_url is unavailable', () => request(app)
      .get('/v1/providers/citizen/null/2.0.0/sha256sums.sig')
      .expect('Content-Type', /application\/json/)
      .expect(404));
  });
});

const { readFile } = require('node:fs/promises');
const path = require('node:path');
const { expect } = require('chai');

const { makeUrl, parseHcl, extractShasum, normalizeSqlitePath } = require('./util');
const helper = require('../test/helper');

describe("util's", () => {
  describe('makeUrl()', () => {
    it('should make new url', () => {
      const req = {
        baseUrl: '/v1/modules',
        _parsedUrl: {
          pathname: '/hashicorp/consul',
        },
      };

      const result = makeUrl(req, { offset: 20, limit: 10 });
      expect(result).to.equal('/v1/modules/hashicorp/consul?offset=20&limit=10');
    });

    it('should make new url without search params', () => {
      const req = {
        baseUrl: '/v1/modules',
        _parsedUrl: {
          pathname: '/hashicorp/consul',
        },
      };

      const result = makeUrl(req);
      expect(result).to.equal('/v1/modules/hashicorp/consul');
    });
  });

  describe('parseHcl()', () => {
    let tarball;

    before(async () => {
      const tarballPath = path.join(__dirname, '../test/fixture/complex.tar.gz');
      tarball = await readFile(tarballPath);
    });

    it('should make JSON from HCL in a compressed module file', async () => {
      const result = await parseHcl('citizen', tarball);

      expect(result).to.have.property('root');
      expect(result).to.have.property('submodules').to.be.an.instanceof(Array);
      expect(result.root).to.have.property('name').to.equal('citizen');
      expect(result.root).to.have.property('outputs').to.be.property('side_effect_alb_dns');
      expect(result.root).to.have.property('module_calls').to.be.property('ecs_service_popular_convention');
    });
  });

  describe('extractShasum()', () => {
    let targetDir;
    let shasumFile;

    before(async () => {
      const result = await helper.generateProvider('citizen-null_1.0.0', ['linux_amd64', 'windows_amd64']);
      [targetDir, , shasumFile] = result; // eslint-disable-line no-unused-vars
    });

    it('should map shasum per provider file', async () => {
      const shasumFilePath = path.join(targetDir, shasumFile);
      const shasumsContent = await readFile(shasumFilePath, 'utf8');
      const result = await extractShasum(shasumsContent);
      expect(result).to.have.property('citizen-null_1.0.0_linux_amd64.zip').to.have.lengthOf.above(50);
      expect(result).to.have.property('citizen-null_1.0.0_windows_amd64.zip').to.have.lengthOf.above(50);
    });
  });

  describe('normalizeSqlitePath()', () => {
    afterEach(() => {
      delete process.pkg;
    });

    it('should change relative sqlite DB path to based on cwd in pkg', async () => {
      process.env.CITIZEN_DATABASE_URL = 'file:./test.db';
      process.pkg = {};
      normalizeSqlitePath();
      expect(process.env.CITIZEN_DATABASE_URL).to.equal(`file:${path.join(process.cwd(), 'test.db')}`);
    });

    it('should change relative sqlite DB path with params to based on cwd in pkg', async () => {
      process.env.CITIZEN_DATABASE_URL = 'file:./test.db?mode=ro';
      process.pkg = {};
      normalizeSqlitePath();
      expect(process.env.CITIZEN_DATABASE_URL).to.equal(`file:${path.join(process.cwd(), 'test.db?mode=ro')}`);
    });

    it('should do nothing for absolute sqlite DB path in pkg', async () => {
      process.env.CITIZEN_DATABASE_URL = 'file:/tmp/test.db';
      process.pkg = {};
      normalizeSqlitePath();
      expect(process.env.CITIZEN_DATABASE_URL).to.equal('file:/tmp/test.db');
    });

    it('should do nothing outside pkg', async () => {
      process.env.CITIZEN_DATABASE_URL = 'file:/tmp/test.db';
      normalizeSqlitePath();
      expect(process.env.CITIZEN_DATABASE_URL).to.equal('file:/tmp/test.db');
    });
  });
});

const { expect } = require('chai');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const { makeUrl, parseHcl, extractShasum } = require('./util');
const { generateProvider } = require('../test/helper');

const readFile = promisify(fs.readFile);

describe('util\'s', () => {
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
      const result = await generateProvider('citizen-null_1.0.0', ['linux_amd64', 'windows_amd64']);
      [targetDir, , shasumFile] = result; // eslint-disable-line no-unused-vars
    });

    it('should map shasum per provider file', async () => {
      const shasumFilePath = path.join(targetDir, shasumFile);
      const shasumsContent = await readFile(shasumFilePath, 'utf8');
      const result = await extractShasum(shasumsContent);
      expect(result)
        .to.have.property('citizen-null_1.0.0_linux_amd64.zip')
        .to.have.lengthOf.above(50);
      expect(result)
        .to.have.property('citizen-null_1.0.0_windows_amd64.zip')
        .to.have.lengthOf.above(50);
    });
  });
});

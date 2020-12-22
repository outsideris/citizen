const { expect } = require('chai');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const { makeUrl, parseHcl } = require('./util');

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
      expect(result.root).to.have.property('name').to.equal('citizen');
      expect(result).to.have.property('submodules').to.be.an.instanceof(Array);
      expect(result.submodules).to.have.lengthOf(3);
    });
  });
});

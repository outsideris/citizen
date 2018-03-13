const { expect } = require('chai');

const { makeUrl } = require('./util');

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
});

const { expect } = require('chai');

const { save } = require('../../lib/store');

describe('store\'s', async () => {
  describe('save()', () => {
    it('should store module meta', async () => {
      const result = await save({
        namespace: 'hashicorp',
        name: 'consul',
        provider: 'aws',
        version: '0.1.0',
        owner: 'outsideris',
      });

      expect(result).to.have.property('ok').to.be.true;
    });
  });
});

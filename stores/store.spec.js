/* eslint-disable no-unused-expressions */
const { expect } = require('chai');

const {
  init,
  type,
  moduleDb,
  saveModule,
} = require('./store');
const { deleteDbAll } = require('../test/helper');

const storeTypes = ['mongodb', 'nedb'];

storeTypes.forEach((storeType) => {
  describe(`${storeType} store`, async () => {
    before(() => {
      init(storeType);
    });

    after(async () => {
      await deleteDbAll(moduleDb(), storeType);
    });

    it(`should use ${storeType}`, () => {
      expect(type()).to.equal(storeType);
    });

    describe('saveModule()', () => {
      it('should store module meta', async () => {
        const result = await saveModule({
          namespace: 'store-hashicorp',
          name: 'store-consul',
          provider: 'store-aws',
          version: '0.1.0',
          owner: 'outsideris',
          location: 'store-hashicorp/store-consul/store-aws/0.1.0/module.tar.gz',
        });

        expect(result._id).to.exist; // eslint-disable-line no-underscore-dangle
        expect(result.name).to.equal('store-consul');
        expect(result.published_at).to.exist;
        expect(result.downloads).to.equal(0);
      });
    });
  });
});

const { expect } = require('chai');

const {
  db,
  save,
  findAll,
  getVersions,
} = require('../../lib/store');
const { deleteDbAll } = require('../helper');

describe('store\'s', async () => {
  describe('save()', () => {
    after(async () => {
      await deleteDbAll(db);
    });

    it('should store module meta', async () => {
      const result = await save({
        namespace: 'store-hashicorp',
        name: 'store-consul',
        provider: 'store-aws',
        version: '0.1.0',
        owner: 'outsideris',
      });

      expect(result).to.have.property('ok').to.be.true;
    });
  });

  describe('findAll()', () => {
    before(async () => {
      await save({
        namespace: 'store-GCP', name: 'store-lb-http', provider: 'store-google', version: '1.0.4', owner: '',
      });
      await save({
        namespace: 'store-aws-modules', name: 'store-vpc', provider: 'store-aws', version: '1.2.1', owner: '',
      });
      await save({
        namespace: 'store-aws-modules', name: 'store-vpc', provider: 'store-aws', version: '1.5.0', owner: '',
      });
      await save({
        namespace: 'store-aws-modules', name: 'store-vpc', provider: 'store-aws', version: '1.5.1', owner: '',
      });
    });

    after(async () => {
      await deleteDbAll(db);
    });

    it('should return all modules', async () => {
      const result = await findAll();

      expect(result).to.have.property('modules').to.have.lengthOf(4);
      expect(result.modules[0]).to.have.property('namespace').to.equal('store-GCP');
    });

    it('should filter modules by namespace', async () => {
      const result = await findAll({
        namespace: 'store-aws-modules',
      });
      expect(result).to.have.property('modules').to.have.lengthOf(3);
      expect(result.modules[0]).to.have.property('namespace').to.equal('store-aws-modules');
    });

    it('should support pagination', async () => {
      const result = await findAll({ offset: 2, limit: 2 });
      expect(result).to.have.property('modules').to.have.lengthOf(2);
      expect(result.modules[0]).to.have.property('namespace').to.equal('store-aws-modules');
      expect(result.modules[0]).to.have.property('version').to.equal('1.5.0');
    });

    it('should return pagination information', async () => {
      const result = await findAll({ offset: 2, limit: 1 });

      expect(result).to.have.property('meta');
      expect(result.meta).to.have.property('limit').to.equal(1);
      expect(result.meta).to.have.property('currentOffset').to.equal(2);
      expect(result.meta).to.have.property('nextOffset').to.equal(3);
      expect(result.meta).to.have.property('prevOffset').to.equal(1);
    });

    it('should prevOffset pagination information', async () => {
      const result = await findAll({ offset: 0, limit: 2 });

      expect(result.meta).to.have.property('limit').to.equal(2);
      expect(result.meta).to.have.property('currentOffset').to.equal(0);
      expect(result.meta).to.have.property('nextOffset').to.equal(2);
      expect(result.meta).to.have.property('prevOffset').to.be.null;
    });

    it('should return pagination information', async () => {
      const result = await findAll({ offset: 2, limit: 2 });

      expect(result.meta).to.have.property('limit').to.equal(2);
      expect(result.meta).to.have.property('currentOffset').to.equal(2);
      expect(result.meta).to.have.property('nextOffset').to.be.null;
      expect(result.meta).to.have.property('prevOffset').to.equal(0);
    });

    it('should filter modules by provider', async () => {
      const result = await findAll({
        provider: 'store-aws',
      });
      expect(result).to.have.property('modules').to.have.lengthOf(3);
      expect(result.modules[0]).to.have.property('namespace').to.equal('store-aws-modules');
    });
  });

  describe('getVersions()', () => {
    before(async () => {
      await save({
        namespace: 'aws-modules', name: 'vpc', provider: 'aws', version: '1.2.1', owner: '',
      });
      await save({
        namespace: 'aws-modules', name: 'vpc', provider: 'aws', version: '1.5.0', owner: '',
      });
      await save({
        namespace: 'aws-modules', name: 'vpc', provider: 'aws', version: '1.5.1', owner: '',
      });
    });

    after(async () => {
      await deleteDbAll(db);
    });

    it('should return available versions', async () => {
      const result = await getVersions({
        namespace: 'aws-modules',
        name: 'vpc',
        provider: 'aws',
      });

      expect(result).to.have.lengthOf(3);
    });
  });
});

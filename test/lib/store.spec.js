const { expect } = require('chai');

const { db, save, findAll } = require('../../lib/store');
const { deleteDbAll } = require('../helper');

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

  describe('findAll()', () => {
    before(async () => {
      await save({
        namespace: 'GCP', name: 'lb-http', provider: 'google', version: '1.0.4', owner: '',
      });
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

    it('should return all modules', async () => {
      const result = await findAll();
      expect(result).to.have.property('modules').to.have.lengthOf(4);
      expect(result.modules[0]).to.have.property('namespace').to.equal('GCP');
    });

    it('should filter modules by namespace', async () => {
      const result = await findAll({
        namespace: 'aws-modules',
      });
      expect(result).to.have.property('modules').to.have.lengthOf(3);
      expect(result.modules[0]).to.have.property('namespace').to.equal('aws-modules');
    });

    it('should support pagination', async () => {
      const result = await findAll({ skip: 2, limit: 2 });
      expect(result).to.have.property('modules').to.have.lengthOf(2);
      expect(result.modules[0]).to.have.property('namespace').to.equal('aws-modules');
      expect(result.modules[0]).to.have.property('version').to.equal('1.5.0');
    });

    it('should return pagination information', async () => {
      const result = await findAll({ skip: 2, limit: 1 });

      expect(result).to.have.property('meta');
      expect(result.meta).to.have.property('limit').to.equal(1);
      expect(result.meta).to.have.property('currentOffset').to.equal(2);
      expect(result.meta).to.have.property('nextOffset').to.equal(3);
      expect(result.meta).to.have.property('prevOffset').to.equal(1);
    });

    it('should prevOffset pagination information', async () => {
      const result = await findAll({ skip: 0, limit: 2 });

      expect(result.meta).to.have.property('limit').to.equal(2);
      expect(result.meta).to.have.property('currentOffset').to.equal(0);
      expect(result.meta).to.have.property('nextOffset').to.equal(2);
      expect(result.meta).to.have.property('prevOffset').to.be.null;
    });

    it('should return pagination information', async () => {
      const result = await findAll({ skip: 2, limit: 2 });

      expect(result.meta).to.have.property('limit').to.equal(2);
      expect(result.meta).to.have.property('currentOffset').to.equal(2);
      expect(result.meta).to.have.property('nextOffset').to.be.null;
      expect(result.meta).to.have.property('prevOffset').to.equal(0);
    });
  });
});

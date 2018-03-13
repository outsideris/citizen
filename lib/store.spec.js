/* eslint-disable no-unused-expressions */
const { expect } = require('chai');

const {
  db,
  save,
  findOne,
  findAll,
  getVersions,
  getLatestVersion,
  increaseDownload,
} = require('./store');
const { deleteDbAll } = require('../test/helper');

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
        location: 'store-hashicorp/store-consul/store-aws/0.1.0/module.tar.gz',
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

  describe('getLatestVersion()', () => {
    before(async () => {
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

    it('should return latest versions for a specific module', async () => {
      const result = await getLatestVersion({
        namespace: 'aws-modules',
        name: 'vpc',
        provider: 'aws',
      });

      expect(result).to.have.property('version').to.equal('1.5.1');
    });

    it('should return null when given module does not exist', async () => {
      const result = await getLatestVersion({
        namespace: 'aws-modules',
        name: 'vpc',
        provider: 'wrong-provider',
      });

      expect(result).to.be.null;
    });
  });

  describe('findOne()', () => {
    before(async () => {
      await save({
        namespace: 'aws-modules', name: 'vpc', provider: 'aws', version: '1.5.1', owner: '', location: 'aws-modules/vpc/aws/1.5.1/module.tar.gz',
      });
    });

    after(async () => {
      await deleteDbAll(db);
    });

    it('should return the specific module', async () => {
      const result = await findOne({
        namespace: 'aws-modules',
        name: 'vpc',
        provider: 'aws',
        version: '1.5.1',
      });

      expect(result).to.have.property('version').to.equal('1.5.1');
    });

    it('should return null when given module does not exist', async () => {
      const result = await findOne({
        namespace: 'aws-modules',
        name: 'vpc',
        provider: 'aws',
        version: '2.5.0',
      });

      expect(result).to.be.null;
    });
  });

  describe('increaseDownload()', () => {
    before(async () => {
      await save({
        namespace: 'aws-modules', name: 'vpc', provider: 'aws', version: '1.5.1', owner: '', location: 'aws-modules/vpc/aws/1.5.1/module.tar.gz',
      });
    });

    after(async () => {
      await deleteDbAll(db);
    });

    it('should increase download count of the module', async () => {
      const result = await increaseDownload({
        namespace: 'aws-modules',
        name: 'vpc',
        provider: 'aws',
        version: '1.5.1',
      });

      expect(result).to.have.property('downloads').to.equal(1);
    });
  });
});

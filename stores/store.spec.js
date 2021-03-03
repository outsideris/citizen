/* eslint-disable no-unused-expressions */
const { expect } = require('chai');

const {
  init,
  getStoreType,
  moduleDb,
  saveModule,
  findAllModules,
  getModuleVersions,
  getModuleLatestVersion,
  findOneModule,
  increaseModuleDownload,
  providerDb,
  saveProvider,
  findOneProvider,
  findAllProviders,
  getProviderVersions,
  findProviderPackage,
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
      expect(getStoreType()).to.equal(storeType);
    });

    describe('module', () => {
      describe('saveModule()', () => {
        after(async () => {
          await deleteDbAll(moduleDb(), storeType);
        });

        it('should store module meta', async () => {
          const result = await saveModule({
            namespace: 'store-hashicorp',
            name: 'store-consul',
            provider: 'store-aws',
            version: '0.1.0',
            owner: 'outsideris',
          });

          expect(result._id).to.exist; // eslint-disable-line no-underscore-dangle
          expect(result.name).to.equal('store-consul');
          expect(result.published_at).to.exist;
          expect(result.downloads).to.equal(0);
        });
      });

      describe('findAllModules()', () => {
        before(async () => {
          await saveModule({
            namespace: 'store-GCP', name: 'store-lb-http', provider: 'store-google', version: '1.0.4', owner: '',
          });
          await saveModule({
            namespace: 'store-aws-modules', name: 'store-vpc', provider: 'store-aws', version: '1.2.1', owner: '',
          });
          await saveModule({
            namespace: 'store-aws-modules', name: 'store-vpc', provider: 'store-aws', version: '1.5.0', owner: '',
          });
          await saveModule({
            namespace: 'store-aws-modules', name: 'store-vpc', provider: 'store-aws', version: '1.5.1', owner: '',
          });
        });

        after(async () => {
          await deleteDbAll(moduleDb(), storeType);
        });

        it('should return all modules', async () => {
          const result = await findAllModules();

          expect(result).to.have.property('modules').to.have.lengthOf(4);
          expect(result.modules[0]).to.have.property('namespace').to.equal('store-GCP');
        });

        it('should filter modules by namespace', async () => {
          const result = await findAllModules({
            namespace: 'store-aws-modules',
          });
          expect(result).to.have.property('modules').to.have.lengthOf(3);
          expect(result.modules[0]).to.have.property('namespace').to.equal('store-aws-modules');
        });

        it('should support pagination', async () => {
          const result = await findAllModules({ offset: 2, limit: 2 });
          expect(result).to.have.property('modules').to.have.lengthOf(2);
          expect(result.modules[0]).to.have.property('namespace').to.equal('store-aws-modules');
          expect(result.modules[0]).to.have.property('version').to.equal('1.5.0');
        });

        it('should return pagination information', async () => {
          const result = await findAllModules({ offset: 2, limit: 1 });

          expect(result).to.have.property('meta');
          expect(result.meta).to.have.property('limit').to.equal(1);
          expect(result.meta).to.have.property('currentOffset').to.equal(2);
          expect(result.meta).to.have.property('nextOffset').to.equal(3);
          expect(result.meta).to.have.property('prevOffset').to.equal(1);
        });

        it('should prevOffset pagination information', async () => {
          const result = await findAllModules({ offset: 0, limit: 2 });

          expect(result.meta).to.have.property('limit').to.equal(2);
          expect(result.meta).to.have.property('currentOffset').to.equal(0);
          expect(result.meta).to.have.property('nextOffset').to.equal(2);
          expect(result.meta).to.have.property('prevOffset').to.be.null;
        });

        it('should return pagination information', async () => {
          const result = await findAllModules({ offset: 2, limit: 2 });

          expect(result.meta).to.have.property('limit').to.equal(2);
          expect(result.meta).to.have.property('currentOffset').to.equal(2);
          expect(result.meta).to.have.property('nextOffset').to.be.null;
          expect(result.meta).to.have.property('prevOffset').to.equal(0);
        });

        it('should filter modules by provider', async () => {
          const result = await findAllModules({
            provider: 'store-aws',
          });
          expect(result).to.have.property('modules').to.have.lengthOf(3);
          expect(result.modules[0]).to.have.property('namespace').to.equal('store-aws-modules');
        });
      });

      describe('getModuleVersions()', () => {
        before(async () => {
          await saveModule({
            namespace: 'aws-modules', name: 'vpc', provider: 'aws', version: '1.2.1', owner: '',
          });
          await saveModule({
            namespace: 'aws-modules', name: 'vpc', provider: 'aws', version: '1.5.0', owner: '',
          });
          await saveModule({
            namespace: 'aws-modules', name: 'vpc', provider: 'aws', version: '1.5.1', owner: '',
          });
        });

        after(async () => {
          await deleteDbAll(moduleDb(), storeType);
        });

        it('should return available versions', async () => {
          const result = await getModuleVersions({
            namespace: 'aws-modules',
            name: 'vpc',
            provider: 'aws',
          });

          expect(result).to.have.lengthOf(3);
        });

        it('should return module with properties', async () => {
          const result = await getModuleVersions({
            namespace: 'aws-modules',
            name: 'vpc',
            provider: 'aws',
          });

          expect(result[0]).to.have.property('version');
          expect(result[0]).to.have.property('submodules');
          expect(result[0]).to.have.property('root');
        });
      });

      describe('getModuleLatestVersion()', () => {
        before(async () => {
          await saveModule({
            namespace: 'aws-modules', name: 'vpc', provider: 'aws', version: '1.5.0', owner: '',
          });
          await saveModule({
            namespace: 'aws-modules', name: 'vpc', provider: 'aws', version: '1.5.1', owner: '',
          });
        });

        after(async () => {
          await deleteDbAll(moduleDb(), storeType);
        });

        it('should return latest versions for a specific module', async () => {
          const result = await getModuleLatestVersion({
            namespace: 'aws-modules',
            name: 'vpc',
            provider: 'aws',
          });

          expect(result).to.have.property('version').to.equal('1.5.1');
        });

        it('should return null when given module does not exist', async () => {
          const result = await getModuleLatestVersion({
            namespace: 'aws-modules',
            name: 'vpc',
            provider: 'wrong-provider',
          });

          expect(result).to.be.null;
        });
      });

      describe('findOneModule()', () => {
        before(async () => {
          await saveModule({
            namespace: 'aws-modules', name: 'vpc', provider: 'aws', version: '1.5.1', owner: '', location: 'aws-modules/vpc/aws/1.5.1/module.tar.gz',
          });
        });

        after(async () => {
          await deleteDbAll(moduleDb(), storeType);
        });

        it('should return the specific module', async () => {
          const result = await findOneModule({
            namespace: 'aws-modules',
            name: 'vpc',
            provider: 'aws',
            version: '1.5.1',
          });

          expect(result).to.have.property('version').to.equal('1.5.1');
        });

        it('should return null when given module does not exist', async () => {
          const result = await findOneModule({
            namespace: 'aws-modules',
            name: 'vpc',
            provider: 'aws',
            version: '2.5.0',
          });

          expect(result).to.be.null;
        });
      });

      describe('increaseModuleDownload()', () => {
        before(async () => {
          await saveModule({
            namespace: 'aws-modules', name: 'vpc', provider: 'aws', version: '1.5.1', owner: '', location: 'aws-modules/vpc/aws/1.5.1/module.tar.gz',
          });
        });

        after(async () => {
          await deleteDbAll(moduleDb(), storeType);
        });

        it('should increase download count of the module', async () => {
          const result = await increaseModuleDownload({
            namespace: 'aws-modules',
            name: 'vpc',
            provider: 'aws',
            version: '1.5.1',
          });

          expect(result).to.have.property('downloads').to.equal(1);
        });
      });
    });

    describe('provider', () => {
      describe('saveProvider()', () => {
        after(async () => {
          await deleteDbAll(providerDb(), storeType);
        });

        it('should store provider meta', async () => {
          const result = await saveProvider({
            namespace: 'outsider',
            type: 'citizen',
            version: '0.1.0',
            protocols: ['4.1', '5.0'],
            platforms: [
              {
                filename: 'outsider-citizen_0.1.0_linux_amd64.zip',
                os: 'linux',
                arch: 'amd64',
                shasum: '5f9c7aa76b7c34d722fc9123208e26b22d60440cb47150dd04733b9b94f4541a',
              },
              {
                filename: 'outsider-citizen_0.1.0_windows_amd64.zip',
                os: 'windows',
                arch: 'amd64',
                shasum: 'af9c7aa76b7c34d722fc9123208e26b22d60440cb47150dd04733b9b94f4541a',
              },
            ],
            gpgPublicKeys: [{
              keyId: 'asdf',
              asciiArmor: '1234',
            }],
          });

          expect(result._id).to.exist; // eslint-disable-line no-underscore-dangle
          expect(result.namespace).to.equal('outsider');
          expect(result.type).to.equal('citizen');
          expect(result.published_at).to.exist;
          expect(result.platforms[0]).to.have.property('os').to.equal('linux');
          expect(result.gpgPublicKeys[0]).to.have.property('keyId').to.equal('asdf');
          expect(result.gpgPublicKeys[0]).to.have.property('asciiArmor').to.equal('1234');
        });
      });

      describe('findOneProvider()', () => {
        before(async () => {
          await saveProvider({
            namespace: 'outsider',
            type: 'citizen',
            version: '1.0.4',
            platforms: [{
              os: 'linux', arch: 'amd64', filename: 'outsider-citizen_1.0.4_linux_amd64.zip', shasum: 'aaabbb1',
            }],
          });
        });

        after(async () => {
          await deleteDbAll(providerDb(), storeType);
        });

        it('should find the provider', async () => {
          const options = {
            namespace: 'outsider',
            type: 'citizen',
            version: '1.0.4',
          };
          const result = await findOneProvider(options);
          expect(result).to.have.property('namespace').to.equal('outsider');
          expect(result).to.have.property('type').to.equal('citizen');
          expect(result).to.have.property('version').to.equal('1.0.4');
        });

        it('should not find provider if not exist', async () => {
          const options = {
            namespace: 'outsider',
            type: 'invisible',
            version: '1.0.4',
          };
          const result = await findOneProvider(options);
          expect(result).to.be.null;
        });
      });

      describe('findAllProviders()', () => {
        before(async () => {
          await saveProvider({
            namespace: 'outsider',
            type: 'citizen',
            version: '1.0.4',
            platforms: [{
              os: 'linux', arch: 'amd64', filename: '', shasum: '',
            }],
          });

          await saveProvider({
            namespace: 'outsider',
            type: 'citizen',
            version: '1.1.0',
            platforms: [{
              os: 'linux', arch: 'amd64', filename: '', shasum: '',
            }],
          });

          await saveProvider({
            namespace: 'thirdparty',
            type: 'terraform',
            version: '1.2.0',
            platforms: [{
              os: 'windows', arch: 'amd64', filename: '', shasum: '',
            }],
          });

          await saveProvider({
            namespace: 'outsider',
            type: 'citizen',
            version: '1.3.0',
            platforms: [{
              os: 'linux', arch: 'amd64', filename: '', shasum: '',
            }],
          });
        });

        after(async () => {
          await deleteDbAll(providerDb(), storeType);
        });

        it('should return all providers', async () => {
          const result = await findAllProviders();

          expect(result).to.have.property('providers').to.have.lengthOf(4);
          expect(result.providers[0]).to.have.property('namespace').to.equal('outsider');
        });

        it('should filter providers by namespace', async () => {
          const result = await findAllProviders({
            namespace: 'outsider',
          });
          expect(result).to.have.property('providers').to.have.lengthOf(3);
          expect(result.providers[0]).to.have.property('namespace').to.equal('outsider');
        });

        it('should support pagination', async () => {
          const result = await findAllProviders({ offset: 2, limit: 2 });
          expect(result).to.have.property('providers').to.have.lengthOf(2);
          expect(result.providers[0]).to.have.property('namespace').to.equal('thirdparty');
          expect(result.providers[0]).to.have.property('version').to.equal('1.2.0');
        });

        it('should return pagination information', async () => {
          const result = await findAllProviders({ offset: 2, limit: 1 });

          expect(result).to.have.property('meta');
          expect(result.meta).to.have.property('limit').to.equal(1);
          expect(result.meta).to.have.property('currentOffset').to.equal(2);
          expect(result.meta).to.have.property('nextOffset').to.equal(3);
          expect(result.meta).to.have.property('prevOffset').to.equal(1);
        });

        it('should prevOffset pagination information', async () => {
          const result = await findAllProviders({ offset: 0, limit: 2 });

          expect(result.meta).to.have.property('limit').to.equal(2);
          expect(result.meta).to.have.property('currentOffset').to.equal(0);
          expect(result.meta).to.have.property('nextOffset').to.equal(2);
          expect(result.meta).to.have.property('prevOffset').to.be.null;
        });

        it('should return pagination information', async () => {
          const result = await findAllProviders({ offset: 2, limit: 2 });

          expect(result.meta).to.have.property('limit').to.equal(2);
          expect(result.meta).to.have.property('currentOffset').to.equal(2);
          expect(result.meta).to.have.property('nextOffset').to.be.null;
          expect(result.meta).to.have.property('prevOffset').to.equal(0);
        });

        it('should filter providers by type', async () => {
          const result = await findAllProviders({
            type: 'terraform',
          });
          expect(result).to.have.property('providers').to.have.lengthOf(1);
          expect(result.providers[0]).to.have.property('namespace').to.equal('thirdparty');
        });
      });

      describe('getProviderVersions()', () => {
        before(async () => {
          await saveProvider({
            namespace: 'outsider',
            type: 'citizen',
            version: '1.0.4',
            platforms: [{
              os: 'linux', arch: 'amd64', filename: '', shasum: '',
            }],
          });

          await saveProvider({
            namespace: 'outsider',
            type: 'citizen',
            version: '1.1.0',
            platforms: [{
              os: 'linux', arch: 'amd64', filename: '', shasum: '',
            }],
          });

          await saveProvider({
            namespace: 'outsider',
            type: 'citizen',
            version: '1.2.0',
            platforms: [{
              os: 'linux', arch: 'amd64', filename: '', shasum: '',
            }],
          });
        });

        after(async () => {
          await deleteDbAll(providerDb(), storeType);
        });

        it('should return available versions', async () => {
          const result = await getProviderVersions({
            namespace: 'outsider',
            type: 'citizen',
          });

          expect(result).to.have.property('id').to.equal('outsider/citizen');
          expect(result).to.have.property('versions')
            .to.be.an('array')
            .to.have.lengthOf(3);
        });

        it('should return provider with properties', async () => {
          const result = await getProviderVersions({
            namespace: 'outsider',
            type: 'citizen',
          });

          expect(result.versions[0]).to.have.property('version');
          expect(result.versions[0]).to.have.property('protocols');
          expect(result.versions[0]).to.have.property('platforms');
        });
      });

      describe('findProviderPackage()', () => {
        before(async () => {
          await saveProvider({
            namespace: 'outsider',
            type: 'citizen',
            version: '1.1.0',
            platforms: [{
              os: 'windows', arch: 'amd64', filename: '', shasum: '',
            }],
          });

          await saveProvider({
            namespace: 'outsider',
            type: 'citizen',
            version: '1.2.0',
            platforms: [{
              os: 'linux', arch: 'amd64', filename: '', shasum: '',
            }],
          });
        });

        after(async () => {
          await deleteDbAll(providerDb(), storeType);
        });

        it('should return provider that matched', async () => {
          const result = await findProviderPackage({
            namespace: 'outsider',
            type: 'citizen',
            version: '1.1.0',
            os: 'windows',
            arch: 'amd64',
          });

          expect(result).to.have.property('version').to.equal('1.1.0');
        });
      });
    });
  });
});

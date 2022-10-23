/* eslint-disable no-unused-expressions */
const { join, parse } = require('node:path');
const { readFile, writeFile } = require('node:fs/promises');
const { promisify } = require('node:util');
const mkdirp = require('mkdirp');
const rmrf = require('rimraf');
const { expect } = require('chai');

const rimraf = promisify(rmrf);

const {
  init,
  getStorageType,
  saveModule,
  hasModule,
  getModule,
  saveProvider,
  hasProvider,
  getProvider,
} = require('./storage');

const storageTypes = ['file'];

storageTypes.forEach((storageType) => {
  describe(`${storageType} storage`, async () => {
    beforeEach(async () => {
      if (storageType === 'file') {
        process.env.CITIZEN_STORAGE_PATH = '/tmp/citizen-test';
      }
      await init(storageType);
    });

    afterEach(async () => {
      await rimraf(process.env.CITIZEN_STORAGE_PATH);
    });

    it(`should use ${storageType}`, () => {
      expect(getStorageType()).to.equal(storageType);
    });

    describe('Module', () => {
      const tarballPath = join(__dirname, '..', 'test', 'fixture', 'module.tar.gz');
      let moduleBuf;

      before(async () => {
        moduleBuf = await readFile(tarballPath);
      });

      describe('saveModule()', () => {
        it('should save the module onto the storage with relative path', async () => {
          process.env.CITIZEN_STORAGE_PATH = './tmp/citizen-test';
          const modulePath = `${new Date().getTime()}/module.tar.gz`;
          const result = await saveModule(modulePath, moduleBuf);
          expect(result).to.be.true;
        });

        it('should save the module onto the storage with absolute path', async () => {
          const modulePath = `${new Date().getTime()}/module.tar.gz`;
          const result = await saveModule(modulePath, moduleBuf);
          expect(result).to.be.true;
        });
      });

      describe('hasModule()', () => {
        it('should return true if the module is already exist', async () => {
          const modulePath = `${new Date().getTime()}/module.tar.gz`;
          const pathToStore = join(process.env.CITIZEN_STORAGE_PATH, 'modules', modulePath);
          const parsedPath = parse(pathToStore);
          await mkdirp(parsedPath.dir);
          await writeFile(pathToStore, moduleBuf);

          const exist = await hasModule(modulePath);
          expect(exist).to.be.true;
        });

        it('should return false if the module is not already exist', async () => {
          const modulePath = `${new Date().getTime()}/module.tar.gz`;
          const exist = await hasModule(`${modulePath}/wrong`);
          expect(exist).to.be.false;
        });
      });

      describe('getModule()', () => {
        it('should get file buffer from the storage', async () => {
          const modulePath = `${new Date().getTime()}/module.tar.gz`;
          const pathToStore = join(process.env.CITIZEN_STORAGE_PATH, 'modules', modulePath);
          const parsedPath = parse(pathToStore);
          await mkdirp(parsedPath.dir);
          await writeFile(pathToStore, moduleBuf);

          const result = await getModule(modulePath);
          expect(result).to.be.an.instanceof(Buffer);
        });
      });
    });

    describe('Provider', () => {
      const tarballPath = join(
        __dirname,
        '..',
        'test',
        'fixture',
        'provider',
        'terraform-provider-null_1.0.0_linux_amd64.zip'
      );
      let providerBuf;

      before(async () => {
        providerBuf = await readFile(tarballPath);
      });

      describe('saveProvider()', () => {
        it('should save the provider onto the storage with relative path', async () => {
          process.env.CITIZEN_STORAGE_PATH = './tmp/citizen-test';
          const providerPath = `${new Date().getTime()}/provider.tar.gz`;
          const result = await saveProvider(providerPath, providerBuf);
          expect(result).to.be.true;
        });

        it('should save the provider onto the storage with absolute path', async () => {
          const providerPath = `${new Date().getTime()}/provider.tar.gz`;
          const result = await saveProvider(providerPath, providerBuf);
          expect(result).to.be.true;
        });
      });

      describe('hasProvider()', () => {
        it('should return true if the provider is already exist', async () => {
          const providerPath = `${new Date().getTime()}/provider.tar.gz`;
          const pathToStore = join(process.env.CITIZEN_STORAGE_PATH, 'providers', providerPath);
          const parsedPath = parse(pathToStore);
          await mkdirp(parsedPath.dir);
          await writeFile(pathToStore, providerBuf);

          const exist = await hasProvider(providerPath);
          expect(exist).to.be.true;
        });

        it('should return false if the provider is not already exist', async () => {
          const providerPath = `${new Date().getTime()}/provider.tar.gz`;
          const exist = await hasProvider(`${providerPath}/wrong`);
          expect(exist).to.be.false;
        });
      });

      describe('getProvider()', () => {
        it('should get file buffer from the storage', async () => {
          const providerPath = `${new Date().getTime()}/provider.tar.gz`;
          const pathToStore = join(process.env.CITIZEN_STORAGE_PATH, 'providers', providerPath);
          const parsedPath = parse(pathToStore);
          await mkdirp(parsedPath.dir);
          await writeFile(pathToStore, providerBuf);

          const result = await getProvider(providerPath);
          expect(result).to.be.an.instanceof(Buffer);
        });
      });
    });
  });
});

const path = require('node:path');
const fs = require('node:fs');
const { promisify } = require('node:util');
const { expect } = require('chai');
const mkdirp = require('mkdirp');
const rmrf = require('rimraf');

const file = require('./file');

const rimraf = promisify(rmrf);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);

describe("file storage's", async () => {
  after(async () => {
    await rimraf(process.env.CITIZEN_STORAGE_PATH);
  });

  describe('Module', () => {
    let modulePath;
    const tarballPath = path.join(__dirname, '..', 'test', 'fixture', 'module.tar.gz');
    let moduleBuf;

    before(async () => {
      moduleBuf = await readFile(tarballPath);
    });

    beforeEach(() => {
      modulePath = `${new Date().getTime()}/module.tar.gz`;
    });

    describe('saveModule()', () => {
      it('should save the module onto disk with relative path', async () => {
        const result = await file.saveModule(modulePath, moduleBuf);
        expect(result).to.be.true;
      });

      it('should save the module onto disk with absolute path', async () => {
        const oldPath = process.env.CITIZEN_STORAGE_PATH;
        process.env.CITIZEN_STORAGE_PATH = '/tmp/citizen-test';

        const result = await file.saveModule(modulePath, moduleBuf);
        expect(result).to.be.true;

        await rimraf(process.env.CITIZEN_STORAGE_PATH);
        process.env.CITIZEN_STORAGE_PATH = oldPath;
      });
    });

    describe('hasModule()', () => {
      it('should return true if the module is already exist', async () => {
        const pathToStore = path.join(process.env.CITIZEN_STORAGE_PATH, 'modules', modulePath);
        const parsedPath = path.parse(pathToStore);
        await mkdirp(parsedPath.dir);
        await writeFile(pathToStore, moduleBuf);

        const exist = await file.hasModule(modulePath);
        expect(exist).to.be.true;
      });

      it('should return false if the module is not already exist', async () => {
        const exist = await file.hasModule(`${modulePath}/wrong`);
        expect(exist).to.be.false;
      });
    });

    describe('getModule()', () => {
      it('should get file buffer from disk', async () => {
        const pathToStore = path.join(process.env.CITIZEN_STORAGE_PATH, 'modules', modulePath);
        const parsedPath = path.parse(pathToStore);
        await mkdirp(parsedPath.dir);
        await writeFile(pathToStore, moduleBuf);

        const result = await file.getModule(modulePath);
        expect(result).to.be.an.instanceof(Buffer);
      });
    });
  });

  describe('Provider', () => {
    let providerPath;
    const tarballPath = path.join(__dirname, '..', 'test', 'fixture', 'provider', 'terraform-provider-null_1.0.0_linux_amd64.zip');
    let providerBuf;

    before(async () => {
      providerBuf = await readFile(tarballPath);
    });

    beforeEach(() => {
      providerPath = `${new Date().getTime()}/provider.tar.gz`;
    });

    describe('saveProvider()', () => {
      it('should save the provider onto disk with relative path', async () => {
        const result = await file.saveProvider(providerPath, providerBuf);
        expect(result).to.be.true;
      });

      it('should save the provider onto disk with absolute path', async () => {
        const oldPath = process.env.CITIZEN_STORAGE_PATH;
        process.env.CITIZEN_STORAGE_PATH = '/tmp/citizen-test';

        const result = await file.saveProvider(providerPath, providerBuf);
        expect(result).to.be.true;

        await rimraf(process.env.CITIZEN_STORAGE_PATH);
        process.env.CITIZEN_STORAGE_PATH = oldPath;
      });
    });

    describe('hasProvider()', () => {
      it('should return true if the provider is already exist', async () => {
        const pathToStore = path.join(process.env.CITIZEN_STORAGE_PATH, 'providers', providerPath);
        const parsedPath = path.parse(pathToStore);
        await mkdirp(parsedPath.dir);
        await writeFile(pathToStore, providerBuf);

        const exist = await file.hasProvider(providerPath);
        expect(exist).to.be.true;
      });

      it('should return false if the provider is not already exist', async () => {
        const exist = await file.hasProvider(`${providerPath}/wrong`);
        expect(exist).to.be.false;
      });
    });

    describe('getProvider()', () => {
      it('should get file buffer from disk', async () => {
        const pathToStore = path.join(process.env.CITIZEN_STORAGE_PATH, 'providers', providerPath);
        const parsedPath = path.parse(pathToStore);
        await mkdirp(parsedPath.dir);
        await writeFile(pathToStore, providerBuf);

        const result = await file.getProvider(providerPath);
        expect(result).to.be.an.instanceof(Buffer);
      });
    });
  });
});

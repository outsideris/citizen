const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const { expect } = require('chai');
const mkdirp = require('mkdirp');
const rimraf = promisify(require('rimraf'));

const { saveModule, hasModule, getModule } = require('./file');

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);

describe('file storage\'s', async () => {
  let modulePath;
  const tarballPath = path.join(__dirname, '..', 'test', 'fixture', 'module.tar.gz');
  let moduleBuf;

  before(async () => {
    moduleBuf = await readFile(tarballPath);
  });

  beforeEach(() => {
    modulePath = `${(new Date()).getTime()}/module.tar.gz`;
  });

  after(async () => {
    await rimraf(process.env.CITIZEN_STORAGE_PATH);
  });

  describe('saveModule()', () => {
    it('should save the module onto disk with relative path', async () => {
      const result = await saveModule(modulePath, moduleBuf);
      expect(result).to.be.true;
    });

    it('should save the module onto disk with absolute path', async () => {
      const oldPath = process.env.CITIZEN_STORAGE_PATH;
      process.env.CITIZEN_STORAGE_PATH = '/tmp/citizen-test';

      const result = await saveModule(modulePath, moduleBuf);
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

      const exist = await hasModule(modulePath);
      expect(exist).to.be.true;
    });

    it('should return false if the module is not already exist', async () => {
      const exist = await hasModule(`${modulePath}/wrong`);
      expect(exist).to.be.false;
    });
  });

  describe('getModule()', () => {
    it('should get file buffer from disk', async () => {
      const pathToStore = path.join(process.env.CITIZEN_STORAGE_PATH, 'modules', modulePath);
      const parsedPath = path.parse(pathToStore);
      await mkdirp(parsedPath.dir);
      await writeFile(pathToStore, moduleBuf);

      const result = await getModule(modulePath);
      expect(result).to.be.an.instanceof(Buffer);
    });
  });
});

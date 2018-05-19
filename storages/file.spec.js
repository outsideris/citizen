const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const { expect } = require('chai');

const { saveModule, hasModule, getModule } = require('./file');

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const mkdirp = promisify(require('mkdirp'));
const rimraf = promisify(require('rimraf'));

describe('file storage\'s', async () => {
  let modulePath;
  const tarballPath = path.join(__dirname, '../test', 'fixture/test.tar.gz');
  let moduleBuf;

  before(async () => {
    moduleBuf = await readFile(tarballPath);
  });

  beforeEach(() => {
    modulePath = `${(new Date()).getTime()}/test.tar.gz`;
  });

  after(async () => {
    await rimraf(process.env.CITIZEN_STORAGE_PATH);
  });

  describe('saveModule()', () => {
    it('should save the module onto disk', async () => {
      const result = await saveModule(modulePath, moduleBuf);
      expect(result).to.be.true;
    });
  });

  describe('hasModule()', () => {
    it('should return true if the module is already exist', async () => {
      const pathToStore = path.join(process.env.CITIZEN_STORAGE_PATH, modulePath);
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
      const pathToStore = path.join(process.env.CITIZEN_STORAGE_PATH, modulePath);
      const parsedPath = path.parse(pathToStore);
      await mkdirp(parsedPath.dir);
      await writeFile(pathToStore, moduleBuf);

      const result = await getModule(modulePath);
      expect(result).to.be.an.instanceof(Buffer);
    });
  });
});

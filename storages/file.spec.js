import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { expect } from 'chai';
import mkdirp from 'mkdirp';
import rmrf from 'rimraf';
import { fileURLToPath } from 'url';

import file from './file.js';

const rimraf = promisify(rmrf);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);

describe('file storage\'s', async () => {
  let modulePath;
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
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

const { readFile, writeFile, access } = require('node:fs/promises');
const { join, parse } = require('node:path');
const debug = require('debug')('citizen:server');
const { mkdirp } = require('mkdirp');

const normalizePath = (path) => join(process.env.CITIZEN_STORAGE_PATH, path);

const file = {
  type: () => 'file',
  setItem: async (path, tarball) => {
    if (!path) {
      throw new Error('path is required.');
    }
    if (!tarball) {
      throw new Error('tarball is required.');
    }

    const pathToStore = normalizePath(path);
    debug(`set item in ${pathToStore}`);
    const parsedPath = parse(pathToStore);
    await mkdirp(parsedPath.dir);

    await writeFile(pathToStore, tarball);

    return true;
  },
  hasItem: async (path) => {
    const pathToStore = normalizePath(path);
    debug(`${pathToStore} is exist`);
    try {
      await access(pathToStore);
      return true;
    } catch (e) {
      return false;
    }
  },
  getItem: async (path) => {
    const pathToStore = normalizePath(path);
    debug(`get item from ${pathToStore}.`);
    try {
      const content = await readFile(pathToStore);
      return content;
    } catch (e) {
      return null;
    }
  },
};

module.exports = file;

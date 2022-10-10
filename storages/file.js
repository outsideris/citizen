const fs = require('node:fs');
const { join, parse } = require('node:path');
const { promisify } = require('node:util');
const debug = require('debug')('citizen:server');
const mkdirp = require('mkdirp');

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const access = promisify(fs.access);

const getModulePath = (path) => join(process.env.CITIZEN_STORAGE_PATH, 'modules', path);
const getProviderPath = (path) => join(process.env.CITIZEN_STORAGE_PATH, 'providers', path);

const file = {
  type: () => 'file',
  saveModule: async (path, tarball) => {
    if (!path) {
      throw new Error('path is required.');
    }
    if (!tarball) {
      throw new Error('tarball is required.');
    }

    const pathToStore = getModulePath(path);
    debug(`save the module into ${pathToStore}.`);
    const parsedPath = parse(pathToStore);
    await mkdirp(parsedPath.dir);

    await writeFile(pathToStore, tarball);

    return true;
  },
  hasModule: async (path) => {
    const pathToStore = getModulePath(path);
    debug(`check if it has module: ${pathToStore}.`);
    try {
      await access(pathToStore);
      return true;
    } catch (e) {
      return false;
    }
  },
  getModule: async (path) => {
    const pathToStore = getModulePath(path);
    debug(`get the module: ${pathToStore}.`);
    try {
      const content = await readFile(pathToStore);
      return content;
    } catch (e) {
      return null;
    }
  },
  saveProvider: async (path, content) => {
    if (!path) {
      throw new Error('path is required.');
    }
    if (!content) {
      throw new Error('content is required.');
    }

    const pathToStore = getProviderPath(path);
    debug(`save the Provider into ${pathToStore}.`);
    const parsedPath = parse(pathToStore);
    await mkdirp(parsedPath.dir);

    await writeFile(pathToStore, content);

    return true;
  },
  hasProvider: async (path) => {
    const pathToStore = getProviderPath(path);
    debug(`check if it has Provider: ${pathToStore}.`);
    try {
      await access(pathToStore);
      return true;
    } catch (e) {
      return false;
    }
  },
  getProvider: async (path) => {
    const pathToStore = getProviderPath(path);
    debug(`get the Provider: ${pathToStore}.`);
    try {
      const content = await readFile(pathToStore);
      return content;
    } catch (e) {
      return null;
    }
  },
};

module.exports = file;

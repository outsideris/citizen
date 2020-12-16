const fs = require('fs');
const { join, parse } = require('path');
const { promisify } = require('util');
const debug = require('debug')('citizen:server');
const mkdirp = require('mkdirp');

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const access = promisify(fs.access);

module.exports = {
  type: () => 'file',
  getModulePath: (path) => join(process.env.CITIZEN_STORAGE_PATH, 'modules', path),
  saveModule: async (path, tarball) => {
    if (!path) { throw new Error('path is required.'); }
    if (!tarball) { throw new Error('tarball is required.'); }

    const pathToStore = module.exports.getModulePath(path);
    debug(`save the module into ${pathToStore}.`);
    const parsedPath = parse(pathToStore);
    await mkdirp(parsedPath.dir);

    await writeFile(pathToStore, tarball);

    return true;
  },
  hasModule: async (path) => {
    const pathToStore = module.exports.getModulePath(path);
    debug(`check if it has module: ${pathToStore}.`);
    try {
      await access(pathToStore);
      return true;
    } catch (e) {
      return false;
    }
  },
  getModule: async (path) => {
    const pathToStore = module.exports.getModulePath(path);
    debug(`get the module: ${pathToStore}.`);
    try {
      const file = await readFile(pathToStore);
      return file;
    } catch (e) {
      return null;
    }
  },
  getProviderPath: (path) => join(process.env.CITIZEN_STORAGE_PATH, 'providers', path),
  saveProvider: async (path, file) => {
    if (!path) { throw new Error('path is required.'); }
    if (!file) { throw new Error('file is required.'); }

    const pathToStore = module.exports.getProviderPath(path);
    debug(`save the Provider into ${pathToStore}.`);
    const parsedPath = parse(pathToStore);
    await mkdirp(parsedPath.dir);

    await writeFile(pathToStore, file);

    return true;
  },
  hasProvider: async (path) => {
    const pathToStore = module.exports.getProviderPath(path);
    debug(`check if it has Provider: ${pathToStore}.`);
    try {
      await access(pathToStore);
      return true;
    } catch (e) {
      return false;
    }
  },
  getProvider: async (path) => {
    const pathToStore = module.exports.getProviderPath(path);
    debug(`get the Provider: ${pathToStore}.`);
    try {
      const file = await readFile(pathToStore);
      return file;
    } catch (e) {
      return null;
    }
  },

};

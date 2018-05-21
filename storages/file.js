const fs = require('fs');
const { join, parse } = require('path');
const { promisify } = require('util');
const debug = require('debug')('citizen:server');
const mkdirp = promisify(require('mkdirp'));

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const access = promisify(fs.access);

// CITIZEN_STORAGE_PATH

module.exports = {
  type: () => 'file',
  saveModule: async (path, tarball) => {
    if (!path) { throw new Error('path is required.'); }
    if (!tarball) { throw new Error('tarball is required.'); }

    const pathToStore = join(process.env.CITIZEN_STORAGE_PATH, path);
    debug(`save the module into ${pathToStore}.`);
    const parsedPath = parse(pathToStore);
    await mkdirp(parsedPath.dir);

    await writeFile(pathToStore, tarball);

    return true;
  },
  hasModule: async (path) => {
    const pathToStore = join(process.env.CITIZEN_STORAGE_PATH, path);
    debug(`check if it has module: ${pathToStore}.`);
    try {
      await access(pathToStore);
      return true;
    } catch (e) {
      return false;
    }
  },
  getModule: async (path) => {
    const pathToStore = join(process.env.CITIZEN_STORAGE_PATH, path);
    debug(`get the module: ${pathToStore}.`);
    try {
      const file = await readFile(pathToStore);
      return file;
    } catch (e) {
      return null;
    }
  },
};

let storage;

const init = (type) => {
  const t = type || process.env.CITIZEN_STORAGE;
  if (t === 's3') {
    storage = require('./s3'); // eslint-disable-line global-require
  } else if (t === 'gs') {
    storage = require('./gs'); // eslint-disable-line global-require
  } else if (t === 'file') {
    storage = require('./file'); // eslint-disable-line global-require
  } else {
    throw new Error(`unknown storage type: ${t}. Please set CITIZEN_STORAGE environment variable.`);
  }
};

const getStorageType = () => storage.type();

const saveModule = async (path, tarball) => {
  return storage.saveModule(path, tarball);
};

const hasModule = async (path) => {
  return storage.hasModule(path);
};

const getModule = async (path) => {
  return storage.getModule(path);
};

const saveProvider = async (path, content) => {
  return storage.saveProvider(path, content);
};

const hasProvider = async (path) => {
  return storage.hasProvider(path);
};

const getProvider = async (path) => {
  return storage.getProvider(path);
};

(async () => {
  await init();
})();

module.exports = {
  init,
  getStorageType,
  saveModule,
  hasModule,
  getModule,
  saveProvider,
  hasProvider,
  getProvider,
};

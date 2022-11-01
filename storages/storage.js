let storage;

const init = (type) => {
  const t = type || process.env.CITIZEN_STORAGE;
  if (t === 's3') {
    storage = require('./s3'); // eslint-disable-line global-require
  } else if (t === 'gcs') {
    storage = require('./gcs'); // eslint-disable-line global-require
  } else if (t === 'file') {
    storage = require('./file'); // eslint-disable-line global-require
  } else {
    throw new Error(`unknown storage type: ${t}. Please set CITIZEN_STORAGE environment variable.`);
  }
};

const getStorageType = () => storage.type();

const saveModule = async (path, tarball) => {
  return storage.setItem(`modules/${path}`, tarball);
};

const hasModule = async (path) => {
  return storage.hasItem(`modules/${path}`);
};

const getModule = async (path) => {
  return storage.getItem(`modules/${path}`);
};

const saveProvider = async (path, tarball) => {
  return storage.setItem(`providers/${path}`, tarball);
};

const hasProvider = async (path) => {
  return storage.hasItem(`providers/${path}`);
};

const getProvider = async (path) => {
  return storage.getItem(`providers/${path}`);
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

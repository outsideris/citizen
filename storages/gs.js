const debug = require('debug')('citizen:server');

const { Storage } = require('@google-cloud/storage');

const GS_BUCKET = process.env.CITIZEN_GCP_GS_BUCKET;
const GS_KEYPATH = process.env.CITIZEN_GCP_GS_KEYPATH;
if (process.env.CITIZEN_STORAGE === 'gs' && !GS_BUCKET && !GS_KEYPATH) {
  throw new Error(
    'Google storage requires CITIZEN_GCP_GS_BUCKET. Additionally, ensure that either CITIZEN_GCP_GS_KEYPATH is set.'
  );
}

const gs = new Storage({
  keyFile: 'key.json',
});

async function saveFile(type, path, tarball) {
  if (!path) {
    throw new Error('path is required.');
  }
  if (!tarball) {
    throw new Error('tarball is required.');
  }

  const file = gs.bucket(GS_BUCKET).file(`${type}/${path}`);
  const result = await file.save(tarball, (err) => {
    if (!err) {
      debug('saved');
      return true;
    }
    return false;
  });

  return !!result;
}

async function hasFile(type, path) {
  try {
    const [resource] = await gs.bucket(GS_BUCKET).file(`${type}/${path}`).getMetadata();
    if (resource.name) {
      debug(`the ${type} already exist: ${path}.`);
      return true;
    }
  } catch (err) {
    // i think error name should be fixed
    if (err.code === 404) {
      debug(`the ${type} doesn't exist: ${path}.`);
      return false;
    }

    throw err;
  }

  debug(`the ${type} doesn't exist: ${path}.`);
  return false;
}

async function getFile(type, path) {
  const file = await gs.bucket(GS_BUCKET).file(`${type}/${path}`);

  return file
    .download({
      // don't set destination here
    })
    .then((data) => data[0]);
}

module.exports = {
  type: () => 'gs',
  saveModule: async (path, tarball) => saveFile('module', path, tarball),
  saveProvider: async (path, tarball) => saveFile('provider', path, tarball),
  hasModule: async (path) => hasFile('module', path),
  getModule: async (path) => getFile('module', path),
  hasProvider: async (path) => hasFile('provider', path),
  getProvider: async (path) => getFile('provider', path),
};

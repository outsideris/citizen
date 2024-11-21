const debug = require('debug')('citizen:server');

// hack for newer versions of node
if (parseInt(process.versions.node.split('.')[0], 10) >= 16 && typeof globalThis === 'undefined') {
  global.globalThis = global;
}

const { Storage } = require('@google-cloud/storage');

// Environment variables
const GS_BUCKET = process.env.CITIZEN_GCP_GS_BUCKET;
const GS_KEYPATH = process.env.CITIZEN_GCP_GS_KEYPATH;
const ACCESS_TOKEN = process.env.CITIZEN_ACCESS_TOKEN;
const SELF_ACCESS = process.env.CITIZEN_SELF_ACCESS;
const CITIZEN_STORAGE = process.env.CITIZEN_STORAGE;

// Ensure bucket is provided
if (CITIZEN_STORAGE === 'gs' && !GS_BUCKET) {
  throw new Error('Google storage requires CITIZEN_GCP_GS_BUCKET.');
}

let storageOptions = {};

switch (true) {
  case !!GS_KEYPATH:
    // Use key file for authentication
    storageOptions = {
      keyFilename: GS_KEYPATH,
    };
    break;

  case !!ACCESS_TOKEN:
    // Use access token for authentication
    storageOptions = {
      projectId: process.env.GCP_PROJECT_ID || null, // Provide projectId if not inferred
      token: ACCESS_TOKEN,
    };
    break;

  case !!SELF_ACCESS:
    // Fallback to system identity (e.g., Workload Identity)
    // No explicit options needed since the library uses default application credentials.
    storageOptions = {};
    break;

  default:
    // Throw an error if no valid authentication method is provided
    throw new Error(
      'No valid authentication method provided. Ensure one of the following is set: '
      + 'CITIZEN_GCP_GS_KEYPATH, CITIZEN_ACCESS_TOKEN, or SELF_ACCESS'
    );
}

// Initialize the Storage client
const gs = new Storage(storageOptions);

async function saveFile(type, path, tarball) {
  if (!path) {
    throw new Error('path is required.');
  }
  if (!tarball) {
    throw new Error('tarball is required.');
  }

  const file = gs.bucket(GS_BUCKET)
    .file(`${type}/${path}`);
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

  return file.download({
    // don't set destination here
  }).then((data) => data[0]);
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

const debug = require('debug')('citizen:server');

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
      + 'CITIZEN_GCP_GS_KEYPATH, CITIZEN_ACCESS_TOKEN, or CITIZEN_SELF_ACCESS'
    );
}

// Initialize the Storage client
const gs = new Storage(storageOptions);

const googleCloudStorage = {
  type: () => 'gcs',
  setItem: async (path, tarball) => {
    if (!path) {
      throw new Error('path is required.');
    }
    if (!tarball) {
      throw new Error('tarball is required.');
    }

    const file = gcs.bucket(GS_BUCKET).file(path);
    try {
      await file.save(tarball);
      return true;
    } catch (err) {
      return false;
    }
  },
  hasItem: async (path) => {
    try {
      const [resource] = await gcs.bucket(GS_BUCKET).file(path).getMetadata();
      if (resource.name) {
        debug(`the item already exist: ${path}.`);
        return true;
      }
    } catch (err) {
      if (err.message.startsWith('No such object:')) {
        debug(`the item doesn't exist: ${path}.`);
        return false;
      }

      throw err;
    }

    debug(`the item doesn't exist: ${path}.`);
    return false;
  },
  getItem: async (path) => {
    const file = await gcs.bucket(GS_BUCKET).file(path);

    return file
      .download({
        // don't set destination here
      })
      .then((data) => data[0]);
  },
};

module.exports = googleCloudStorage;

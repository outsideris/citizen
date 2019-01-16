const { Storage } = require('@google-cloud/storage');
const debug = require('debug')('citizen:server');

const gcs = new Storage();

const GCS_BUCKET = process.env.CITIZEN_GCP_GCS_BUCKET;
if (process.env.CITIZEN_STORAGE === 'gcp' && !GCS_BUCKET) {
  throw new Error('GCS storage requires CITIZEN_GCP_GCS_BUCKET');
}

module.exports = {
  type: () => 'gcp',
  saveModule: async (path, tarball) => {
    debug(`save the module into ${path}.`);

    if (!path) { throw new Error('path is required.'); }
    if (!tarball) { throw new Error('tarball is required.'); }

    bucket = gcs.bucket(GCS_BUCKET);
    file = bucket.file(path);
    try {
      await file.save(tarball);
      return true;
    } catch (error) {
      return false;
    }
  },
  hasModule: async (path) => {
    bucket = gcs.bucket(GCS_BUCKET);
    file = bucket.file(path);
    result = await file.exists();
    return (result[0] === true);
  },
  getModule: async (path) => {
    debug(`get the module: ${path}.`);
    bucket = gcs.bucket(GCS_BUCKET);
    file = bucket.file(path);
    result = await file.get();
    return result[0]
  },
};

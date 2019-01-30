const { Storage } = require('@google-cloud/storage');
const debug = require('debug')('citizen:server');

const gcs = new Storage();

const GCS_BUCKET = process.env.CITIZEN_GCP_GCS_BUCKET;

if (process.env.CITIZEN_STORAGE === 'gcs' && !GCS_BUCKET) {
  throw new Error('GCS storage requires CITIZEN_GCP_GCS_BUCKET');
}
module.exports = {
  type: () => 'gcs',
  saveModule: async (path, tarball) => {
    debug(`save the module into ${path}.`);

    if (!path) { throw new Error('path is required.'); }
    if (!tarball) { throw new Error('tarball is required.'); }

    const bucket = gcs.bucket(GCS_BUCKET);
    const file = bucket.file(path);
    try {
      await file.save(tarball);
      return true;
    } catch (error) {
      return false;
    }
  },
  hasModule: async (path) => {
    const bucket = gcs.bucket(GCS_BUCKET);
    const file = bucket.file(path);
    const result = await file.exists();
    return (result[0] === true);
  },
  getModule: async (path) => {
    debug(`get the module: ${path}.`);
    const bucket = gcs.bucket(GCS_BUCKET);
    const file = bucket.file(path);
    const result = await file.download();
    return result[0];
  },
};

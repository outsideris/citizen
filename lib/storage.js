/* eslint-disable global-require */
let type;
let saveModule;
let hasModule;
let getModule;

if (process.env.CITIZEN_STORAGE === 's3') {
  ({
    type, saveModule, hasModule, getModule,
  } = require('../storages/s3'));
} else if (process.env.CITIZEN_STORAGE === 'gcs') {
  ({
    type, saveModule, hasModule, getModule,
  } = require('../storages/gcs'));
} else {
  ({
    type, saveModule, hasModule, getModule,
  } = require('../storages/file'));
}

exports.type = type;
exports.saveModule = saveModule;
exports.hasModule = hasModule;
exports.getModule = getModule;

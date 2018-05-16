/* eslint-disable global-require */
let saveModule;
let hasModule;
let getModule;

if (process.env.STORAGE === 's3') {
  ({ saveModule, hasModule, getModule } = require('../storages/s3'));
} else {
  // FIXME: It should be default storage type
  ({ saveModule, hasModule, getModule } = require('../storages/s3'));
}

exports.saveModule = saveModule;
exports.hasModule = hasModule;
exports.getModule = getModule;

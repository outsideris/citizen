/* eslint-disable global-require */
let type;
let saveModule;
let hasModule;
let getModule;

if (process.env.STORAGE === 's3') {
  ({ type, saveModule, hasModule, getModule } = require('../storages/s3'));
} else {
  // FIXME: It should be default storage type
  ({ type, saveModule, hasModule, getModule } = require('../storages/s3'));
}

exports.type = type;
exports.saveModule = saveModule;
exports.hasModule = hasModule;
exports.getModule = getModule;

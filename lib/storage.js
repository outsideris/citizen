/* eslint-disable global-require */
let type;
let saveModule;
let hasModule;
let getModule;
let saveProvider;
let hasProvider;
let getProvider;

switch (process.env.CITIZEN_STORAGE) {
  case 's3':
    ({ type, saveModule, hasModule, getModule, saveProvider, hasProvider, getProvider } = require('../storages/s3'));
    break;
  case 'gs':
    ({ type, saveModule, hasModule, getModule, saveProvider, hasProvider, getProvider } = require('../storages/gs'));
    break;
  default:
    ({ type, saveModule, hasModule, getModule, saveProvider, hasProvider, getProvider } = require('../storages/file'));
    break;
}

module.exports = {
  type,
  saveModule,
  hasModule,
  getModule,
  saveProvider,
  hasProvider,
  getProvider,
};

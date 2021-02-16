/* eslint-disable global-require */
const {
  providerDb,
  saveProvider,
  findAllProviders,
  findProviderPackage,
} = require('../stores/store');

exports.db = providerDb();
exports.save = saveProvider();
exports.findAll = findAllProviders;
exports.findProviderPackage = findProviderPackage;

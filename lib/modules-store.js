/* eslint-disable global-require */
const {
  moduleDb,
  saveModule,
  findAllModules,
  getModuleVersions,
  getModuleLatestVersion,
  findOneModule,
  increaseModuleDownload,
} = require('../stores/store');

exports.db = moduleDb();
exports.save = saveModule;
exports.findOne = findOneModule;
exports.findAll = findAllModules;
exports.getVersions = getModuleVersions;
exports.getLatestVersion = getModuleLatestVersion;
exports.increaseDownload = increaseModuleDownload;

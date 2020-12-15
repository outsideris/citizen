/* eslint-disable global-require */
let db;
let save;
let findOne;
let findById;
let findAll;
let getVersions;
let getLatestVersion;
let increaseDownload;
let findProviderPackage;

if (process.env.CITIZEN_DATABASE === 'mongodb') {
  ({
    db, save, findOne, findAll, getVersions, getLatestVersion,
    increaseDownload, findProviderPackage, findById,
  } = require('../stores/providers-mongodb'));
} else {
  ({
    db, save, findOne, findAll, getVersions, getLatestVersion,
    increaseDownload, findProviderPackage, findById,
  } = require('../stores/providers-nedb'));
}

exports.db = db;
exports.save = save;
exports.findById = findById;
exports.findOne = findOne;
exports.findAll = findAll;
exports.getVersions = getVersions;
exports.getLatestVersion = getLatestVersion;
exports.increaseDownload = increaseDownload;
exports.findProviderPackage = findProviderPackage;

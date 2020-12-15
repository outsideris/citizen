/* eslint-disable global-require */
let db;
let save;
let findOne;
let findAll;
let getVersions;
let getLatestVersion;
let increaseDownload;

if (process.env.CITIZEN_DATABASE === 'mongodb') {
  ({
    db, save, findOne, findAll, getVersions, getLatestVersion, increaseDownload,
  } = require('../stores/modules-mongodb'));
} else {
  ({
    db, save, findOne, findAll, getVersions, getLatestVersion, increaseDownload,
  } = require('../stores/modules-nedb'));
}

exports.db = db;
exports.save = save;
exports.findOne = findOne;
exports.findAll = findAll;
exports.getVersions = getVersions;
exports.getLatestVersion = getLatestVersion;
exports.increaseDownload = increaseDownload;

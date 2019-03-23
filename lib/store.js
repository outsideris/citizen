/* eslint-disable global-require */
let db;
let save;
let findOne;
let findAll;
let getVersions;
let getLatestVersion;
let increaseDownload;

if (process.env.CITIZEN_DATABASE === 'nedb') {
  ({
    db, save, findOne, findAll, getVersions, getLatestVersion, increaseDownload,
  } = require('../stores/nedb'));
} else {
  ({
    db, save, findOne, findAll, getVersions, getLatestVersion, increaseDownload,
  } = require('../stores/nedb'));
}

exports.db = db;
exports.save = save;
exports.findOne = findOne;
exports.findAll = findAll;
exports.getVersions = getVersions;
exports.getLatestVersion = getLatestVersion;
exports.increaseDownload = increaseDownload;

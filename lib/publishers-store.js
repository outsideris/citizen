/* eslint-disable global-require */

let store;

if (process.env.CITIZEN_DATABASE === 'mongodb') {
  store = require('../stores/publishers-mongodb');
} else {
  store = require('../stores/publishers-nedb');
}

exports.db = store.db;
exports.save = store.save;
exports.update = store.update;
exports.findOne = store.findOne;
exports.findAll = store.findAll;

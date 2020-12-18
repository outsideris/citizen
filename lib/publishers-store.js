/* eslint-disable global-require */

let store;

if (process.env.CITIZEN_DATABASE === 'mongodb') {
  const mongoStore = require('../stores/publishers-mongodb');
  store = mongoStore;
} else {
  const nedbStore = require('../stores/publishers-nedb');
  store = nedbStore;
}

exports.db = store.db;
exports.save = store.save;
exports.findOne = store.findOne;
exports.findAll = store.findAll;

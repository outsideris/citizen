/* eslint-disable global-require */

let store;

if (process.env.CITIZEN_DATABASE === 'mongodb') {
  store = require('../stores/publishers-mongodb');
} else {
  store = require('../stores/publishers-nedb');
}

const {
  db, save, findOne, findAll,
} = store;

exports.db = db;
exports.save = save;
exports.findOne = findOne;
exports.findAll = findAll;

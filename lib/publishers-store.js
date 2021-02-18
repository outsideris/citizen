/* eslint-disable global-require */
const {
  publisherDb,
  savePublisher,
  updatePublisher,
  findAllPublishers,
  findOnePublisher,
} = require('../stores/store');

exports.db = publisherDb();
exports.save = savePublisher;
exports.update = updatePublisher;
exports.findOne = findOnePublisher;
exports.findAll = findAllPublishers;

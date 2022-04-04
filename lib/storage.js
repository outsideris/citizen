const s3 = require('../storages/s3');
const file = require('../storages/file');

const storage = process.env.CITIZEN_STORAGE === 's3' ? s3 : file;

module.exports = storage;

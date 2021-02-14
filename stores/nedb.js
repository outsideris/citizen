const Datastore = require('nedb');
const { v4: uuid } = require('uuid');
const { join } = require('path');
const debug = require('debug')('citizen:server:store:nedb');

const dbDir = process.env.CITIZEN_DB_DIR || 'data';
const moduleDbPath = join(dbDir, 'citizen.db');
const moduleDb = new Datastore({ filename: moduleDbPath, autoload: true });

const type = 'nedb';

const saveModule = (data) => new Promise((resolve, reject) => {
  const m = Object.assign(data, { _id: `${uuid()}`, downloads: 0, published_at: new Date() });

  moduleDb.insert(m, (err, newDoc) => {
    if (err) { return reject(err); }
    debug('saved the module into db: %o', module);
    return resolve(newDoc);
  });
});

module.exports = {
  type,
  moduleDb,
  saveModule,
};

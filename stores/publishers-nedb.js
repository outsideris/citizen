const Datastore = require('nedb');
const { v4: uuid } = require('uuid');
const { join } = require('path');
const debug = require('debug')('citizen:server');

const dbDir = process.env.CITIZEN_DB_DIR || 'data';
const dbPath = join(dbDir, 'citizen-publishers.db');
const db = new Datastore({ filename: dbPath, autoload: true });

const save = (data) => new Promise((resolve, reject) => {
  const {
    name,
    url,
    trustSignature,
    gpgKeys,
  } = data;

  if (!name) { return reject(new Error('name required.')); }
  if (!gpgKeys) { return reject(new Error('gpgKeys required.')); }

  for (let i = 0; i < gpgKeys.length; i += 1) {
    if (!gpgKeys[i].keyId) {
      return reject(new Error(`gpgKeys[${i}].keyId required.`));
    }
    if (!gpgKeys[i].asciiArmor) {
      return reject(new Error(`gpgKeys[${i}].asciiArmor required.`));
    }
  }

  const publisher = {
    _id: `${uuid()}`,
    name,
    url,
    trustSignature,
    gpgKeys,
  };

  return db.insert(publisher, (err, newDoc) => {
    if (err) { return reject(err); }
    debug('saved the publisher into db: %o', publisher);
    return resolve(newDoc);
  });
});

const findAll = ({
  selector = {},
  offset = 0,
  limit = 15,
} = {}) => new Promise((resolve, reject) => {
  const options = selector;

  debug('search db with %o', options);

  db.find(options, (err, allDocs) => {
    if (err) { return reject(err); }

    const totalRows = allDocs.length;
    const meta = {
      limit: +limit,
      currentOffset: +offset,
      nextOffset: +offset + +limit,
      prevOffset: +offset - +limit,
    };
    if (meta.prevOffset < 0) { meta.prevOffset = null; }
    if (meta.nextOffset >= totalRows) { meta.nextOffset = null; }

    return db.find(options).sort({ published_at: 1, version: 1 }).skip(+offset).limit(+limit)
      .exec((error, docs) => {
        if (error) { return reject(err); }

        debug('search result from db: %o', docs);
        return resolve({
          meta,
          publishers: docs,
        });
      });
  });
});

const findOne = async ({
  name,
} = {}) => new Promise((resolve, reject) => {
  if (!name) { reject(new Error('name required.')); }

  const options = {
    name,
  };

  debug('search a publisher in db with %o', options);
  db.find(options, (err, docs) => {
    if (err) { return reject(err); }

    debug('search a publisher result from db: %o', docs);
    return resolve(docs.length > 0 ? docs[0] : null);
  });
});

module.exports = {
  db,
  save,
  findOne,
  findAll,
};

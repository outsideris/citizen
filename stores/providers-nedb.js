const Datastore = require('nedb');
const { v4: uuid } = require('uuid');
const { join } = require('path');
const debug = require('debug')('citizen:server');

const dbDir = process.env.CITIZEN_DB_DIR || 'data';
const dbPath = join(dbDir, 'citizen-providers.db');
const db = new Datastore({ filename: dbPath, autoload: true });

const save = (data) => new Promise((resolve, reject) => {
  const {
    namespace,
    type,
    version,
    platforms,
  } = data;

  const module = {
    _id: `${uuid()}`,
    namespace,
    type,
    version,
    platforms,
    published_at: new Date(),
  };

  db.insert(module, (err, newDoc) => {
    if (err) { return reject(err); }
    debug('saved the module into db: %o', module);
    return resolve(newDoc);
  });
});

const findAll = ({
  selector = {},
  namespace = '',
  type = '',
  offset = 0,
  limit = 15,
} = {}) => new Promise((resolve, reject) => {
  const options = selector;

  if (namespace) {
    options.namespace = namespace;
  }

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
          providers: docs,
        });
      });
  });
});

const getVersions = ({ namespace, type } = {}) => new Promise((resolve, reject) => {
  if (!namespace) { reject(new Error('namespace required.')); }
  if (!type) { reject(new Error('type required.')); }

  const options = {
    namespace,
    type,
  };

  debug('search versions in db with %o', options);
  db.find(options).sort({ version: 1 }).exec((err, docs) => {
    if (err) { return reject(err); }

    const data = docs;

    debug('search versions result from db: %o', data);
    return resolve(data);
  });
});

const getLatestVersion = async ({ namespace, name, provider } = {}) => new Promise(
  (resolve, reject) => {
    if (!namespace) { reject(new Error('namespace required.')); }
    if (!name) { reject(new Error('name required.')); }
    if (!provider) { reject(new Error('provider required.')); }

    const options = {
      namespace,
      name,
      provider,
    };

    db.find(options).sort({ version: -1 }).limit(1).exec((err, docs) => {
      if (err) { return reject(err); }

      debug('search latest version result from db: %o', docs);
      return resolve(docs.length > 0 ? docs[0] : null);
    });
  },
);

const findOne = async ({
  namespace,
  type,
  version,
} = {}) => new Promise((resolve, reject) => {
  if (!namespace) { reject(new Error('namespace required.')); }
  if (!type) { reject(new Error('type required.')); }
  if (!version) { reject(new Error('version required.')); }

  const options = {
    namespace,
    type,
    version,
  };

  debug('search a provider in db with %o', options);
  db.find(options, (err, docs) => {
    if (err) { return reject(err); }

    debug('search a provider result from db: %o', docs);
    return resolve(docs.length > 0 ? docs[0] : null);
  });
});

const findById = async ({
  id,
} = {}) => new Promise((resolve, reject) => {
  if (!id) { reject(new Error('version required.')); }

  const options = {
    _id: id,
  };

  debug('search a provider in db with %o', options);
  db.find(options, (err, docs) => {
    if (err) { return reject(err); }

    debug('search a provider result from db: %o', docs);
    return resolve(docs.length > 0 ? docs[0] : null);
  });
});

const findProviderPackage = async ({
  namespace,
  type,
  version,
  os,
  arch,
} = {}) => new Promise((resolve, reject) => {
  if (!namespace) { reject(new Error('namespace required.')); }
  if (!type) { reject(new Error('type required.')); }
  if (!os) { reject(new Error('os required.')); }
  if (!arch) { reject(new Error('arch required.')); }
  if (!version) { reject(new Error('version required.')); }

  const options = {
    namespace,
    type,
    version,
    'platforms.os': os,
    'platforms.arch': arch,
  };

  debug('search a module in db with %o', options);
  db.find(options, (err, docs) => {
    if (err) { return reject(err); }

    debug('search a module result from db: %o', docs);
    return resolve(docs.length > 0 ? docs[0] : null);
  });
});

const increaseDownload = async ({
  namespace,
  name,
  provider,
  version,
} = {}) => new Promise((resolve, reject) => {
  if (!namespace) { reject(new Error('namespace required.')); }
  if (!name) { reject(new Error('name required.')); }
  if (!provider) { reject(new Error('provider required.')); }
  if (!version) { reject(new Error('version required.')); }

  const options = {
    namespace,
    name,
    provider,
    version,
  };

  db.update(
    options,
    { $inc: { downloads: 1 } },
    { returnUpdatedDocs: true },
    (err, numAffected, affectedDocuments) => {
      if (err) { return reject(err); }

      return resolve(affectedDocuments);
    },
  );
});

module.exports = {
  db,
  save,
  findOne,
  findAll,
  getVersions,
  getLatestVersion,
  increaseDownload,
  findProviderPackage,
  findById,
};

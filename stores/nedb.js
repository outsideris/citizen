const Datastore = require('nedb');
const { v4: uuid } = require('uuid');
const { join } = require('path');
const debug = require('debug')('citizen:server:store:nedb');

const dbDir = process.env.CITIZEN_DB_DIR || 'data';

const moduleDbPath = join(dbDir, 'citizen.db');
const moduleDb = new Datastore({ filename: moduleDbPath, autoload: true });

const storeType = 'nedb';

// modules
const saveModule = (data) => new Promise((resolve, reject) => {
  const m = Object.assign(data, { _id: `${uuid()}`, downloads: 0, published_at: new Date() });

  moduleDb.insert(m, (err, newDoc) => {
    if (err) { return reject(err); }
    debug('saved the module into store: %o', module);
    return resolve(newDoc);
  });
});

const findModules = (options) => new Promise((resolve, reject) => {
  moduleDb.find(options, (err, allDocs) => {
    if (err) {
      return reject(err);
    }

    return resolve(allDocs);
  });
});

const findAllModules = (options, meta, offset, limit) => new Promise((resolve, reject) => {
  debug('search store with %o', options);

  moduleDb.find(options).sort({ published_at: 1, version: 1 }).skip(offset).limit(limit)
    .exec((error, docs) => {
      if (error) { return reject(error); }

      debug('search result from store: %o', docs);
      return resolve({
        meta,
        modules: docs,
      });
    });
});

const getModuleVersions = (options) => new Promise((resolve, reject) => {
  debug('search module versions in store with %o', options);
  moduleDb.find(options).sort({ _id: 1 }).exec((err, docs) => {
    if (err) { return reject(err); }

    return resolve(docs);
  });
});

const getModuleLatestVersion = (options) => new Promise((resolve, reject) => {
  moduleDb.find(options).sort({ version: -1 }).limit(1).exec((err, docs) => {
    if (err) { return reject(err); }

    debug('search latest version result from store: %o', docs);
    return resolve(docs.length > 0 ? docs[0] : null);
  });
});

const findOneModule = (options) => new Promise((resolve, reject) => {
  debug('search a module in store with %o', options);
  moduleDb.find(options, (err, docs) => {
    if (err) { return reject(err); }

    debug('search a module result from store: %o', docs);
    return resolve(docs.length > 0 ? docs[0] : null);
  });
});

const increaseModuleDownload = (options) => new Promise((resolve, reject) => {
  moduleDb.update(
    options,
    { $inc: { downloads: 1 } },
    { returnUpdatedDocs: true },
    (err, numAffected, affectedDocuments) => {
      if (err) { return reject(err); }

      return resolve(affectedDocuments);
    },
  );
});

// providers
const providerDbPath = join(dbDir, 'citizen-providers.db');
const providerDb = new Datastore({ filename: providerDbPath, autoload: true });

const saveProvider = (data) => new Promise((resolve, reject) => {
  const p = Object.assign(data, { _id: `${uuid()}`, published_at: new Date() });
  if (!p.protocols) { p.protocols = []; }

  providerDb.insert(p, (err, newDoc) => {
    if (err) { return reject(err); }
    debug('saved the provider into db: %o', module);
    return resolve(newDoc);
  });
});

const findOneProvider = (options) => new Promise((resolve, reject) => {
  debug('search a provider in store with %o', options);
  providerDb.find(options, (err, docs) => {
    if (err) { return reject(err); }

    debug('search a provider result from store: %o', docs);
    return resolve(docs.length > 0 ? docs[0] : null);
  });
});

const findProviders = (options) => new Promise((resolve, reject) => {
  providerDb.find(options, (err, allDocs) => {
    if (err) {
      return reject(err);
    }

    return resolve(allDocs);
  });
});

const findAllProviders = (options, meta, offset, limit) => new Promise((resolve, reject) => {
  debug('search store with %o', options);

  providerDb.find(options).sort({ published_at: 1, version: 1 }).skip(offset).limit(limit)
    .exec((error, docs) => {
      if (error) { return reject(error); }

      debug('search result from store: %o', docs);
      return resolve({
        meta,
        providers: docs,
      });
    });
});

const getProviderVersions = (options) => new Promise((resolve, reject) => {
  debug('search provider versions in store with %o', options);
  providerDb.find(options).sort({ version: 1 }).exec((err, docs) => {
    if (err) { return reject(err); }

    return resolve(docs);
  });
});

const findProviderPackage = (options) => new Promise((resolve, reject) => {
  providerDb.find(options).sort({ version: -1 }).exec((err, docs) => {
    if (err) { return reject(err); }

    return resolve(docs.length > 0 ? docs[0] : null);
  });
});

module.exports = {
  storeType,
  moduleDb,
  saveModule,
  findModules,
  findAllModules,
  getModuleVersions,
  getModuleLatestVersion,
  findOneModule,
  increaseModuleDownload,
  providerDb,
  saveProvider,
  findOneProvider,
  findProviders,
  findAllProviders,
  getProviderVersions,
  findProviderPackage,
};

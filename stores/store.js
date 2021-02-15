/* eslint-disable global-require */
const debug = require('debug')('citizen:server:store');

let store;

const init = (dbType) => {
  const t = dbType || process.env.CITIZEN_DATABASE;
  if (t === 'mongodb') {
    store = require('./mongodb');
  } else {
    store = require('./nedb');
  }
};

const type = () => store.type;

const moduleDb = () => store.moduleDb;

const saveModule = async (data) => {
  const {
    namespace,
    name,
    provider,
    version,
    owner,
    location,
    definition = {},
  } = data;

  const module = {
    owner: owner || '',
    namespace,
    name,
    provider,
    version,
    location,
    ...definition,
  };

  const m = await store.saveModule(module);
  debug('saved the module into store: %o', module);
  return m;
};

const findAllModules = async ({
  selector = {},
  namespace = '',
  provider = '',
  offset = 0,
  limit = 15,
} = {}) => {
  const options = selector;

  if (namespace) {
    options.namespace = namespace;
  }
  if (provider) {
    options.provider = provider;
  }
  debug('search store with %o', options);

  const modules = await store.findModules(options);
  const totalRows = modules.length;
  const meta = {
    limit: +limit,
    currentOffset: +offset,
    nextOffset: +offset + +limit,
    prevOffset: +offset - +limit,
  };
  if (meta.prevOffset < 0) { meta.prevOffset = null; }
  if (meta.nextOffset >= totalRows) { meta.nextOffset = null; }

  const result = await store.findAllModules(options, meta, +offset, +limit);
  return result;
};

const getModuleVersions = async ({ namespace, name, provider } = {}) => {
  if (!namespace) { reject(new Error('namespace required.')); }
  if (!name) { reject(new Error('name required.')); }
  if (!provider) { reject(new Error('provider required.')); }

  const options = {
    namespace,
    name,
    provider,
  };

  debug('search versions in store with %o', options);
  const docs = await store.getModuleVersions(options);

  const result = docs.map((d) => ({
    version: d.version,
    submodules: d.submodules,
    root: d.root,
  }));
  debug('search versions result from store: %o', docs);
  return result;
};

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

init();

module.exports = {
  init,
  type,
  moduleDb,
  saveModule,
  findAllModules,
  getModuleVersions,

  findOne,
  getLatestVersion,
  increaseDownload,
};

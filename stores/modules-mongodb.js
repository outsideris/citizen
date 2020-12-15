const debug = require('debug')('citizen:server');
const mongoose = require('mongoose');

const dbUri = process.env.CITIZEN_MONGO_DB_URI || 'mongodb://localhost:27017/citizen';

mongoose.connect(dbUri, { useUnifiedTopology: true, useNewUrlParser: true });

const Module = mongoose.model('Module', {
  namespace: String,
  name: String,
  provider: String,
  version: String,
  owner: { type: String, default: '' },
  location: String,
  definition: mongoose.Schema.Types.Mixed,
  downloads: { type: Number, default: 0 },
  published_at: { type: Date, default: Date.now },
});

const db = Module;

const save = (data) => new Promise((resolve, reject) => {
  const {
    namespace,
    name,
    provider,
    version,
    owner,
    location,
    definition = {},
  } = data;

  const module = new Module({
    owner,
    namespace,
    name,
    provider,
    version,
    location,
    ...definition,
  });

  module.save()
    .then((newDoc) => {
      debug('saved the module into db: %o', module);
      return resolve(newDoc);
    })
    .catch((err) => reject(err));
});

const findAll = ({
  selector = {},
  namespace = '',
  provider = '',
  offset = 0,
  limit = 15,
} = {}) => new Promise((resolve, reject) => {
  const options = selector;

  if (namespace) {
    options.namespace = namespace;
  }
  if (provider) {
    options.provider = provider;
  }
  debug('search db with %o', options);
  Module.find(options)
    .then((allDocs) => {
      const totalRows = allDocs.length;
      const meta = {
        limit: +limit,
        currentOffset: +offset,
        nextOffset: +offset + +limit,
        prevOffset: +offset - +limit,
      };
      if (meta.prevOffset < 0) { meta.prevOffset = null; }
      if (meta.nextOffset >= totalRows) { meta.nextOffset = null; }

      return Module.find(options, null, { sort: '_id', skip: +offset, limit: +limit })
        .then((docs) => {
          debug('search result from db: %o', docs);
          return resolve({
            meta,
            modules: docs,
          });
        })
        .catch((err) => reject(err));
    })
    .catch((err) => reject(err));
});

const getVersions = ({
  namespace,
  name,
  provider,
} = {}) => new Promise((resolve, reject) => {
  if (!namespace) { reject(new Error('namespace required.')); }
  if (!name) { reject(new Error('name required.')); }
  if (!provider) { reject(new Error('provider required.')); }

  const options = {
    namespace,
    name,
    provider,
  };

  debug('search versions in db with %o', options);
  Module.find(options, null, { sort: '_id' })
    .then((docs) => {
      const data = docs.map((d) => ({
        version: d.version,
        submodules: d.submodules,
        root: d.root,
      }));
      debug('search versions result from db: %o', docs);
      return resolve(data);
    })
    .catch((err) => reject(err));
});

const getLatestVersion = async ({
  namespace,
  name,
  provider,
} = {}) => new Promise((resolve, reject) => {
  if (!namespace) { reject(new Error('namespace required.')); }
  if (!name) { reject(new Error('name required.')); }
  if (!provider) { reject(new Error('provider required.')); }

  const options = {
    namespace,
    name,
    provider,
  };

  Module.find(options, null, { sort: '-version', limit: 1 })
    .then((docs) => {
      debug('search latest version result from db: %o', docs);
      return resolve(docs.length > 0 ? docs[0] : null);
    })
    .catch((err) => reject(err));
});

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
  Module.find(options)
    .then((docs) => resolve(docs.length > 0 ? docs[0] : null))
    .catch((err) => reject(err));
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

  Module.findOneAndUpdate(options, { $inc: { downloads: 1 } }, { new: true })
    .then((doc) => resolve(doc))
    .catch((err) => reject(err));
});

module.exports = {
  db,
  save,
  findOne,
  findAll,
  getVersions,
  getLatestVersion,
  increaseDownload,
};

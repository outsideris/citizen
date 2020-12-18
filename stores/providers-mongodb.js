const debug = require('debug')('citizen:server');

const mongoose = require('./mongodb');

const Provider = mongoose.model('Provider', {
  namespace: String,
  type: String,
  version: String,

  platforms: [new mongoose.Schema({
    os: { type: String },
    arch: { type: String },
    location: { type: String },
    filename: { type: String },
    shasum: { type: String },
  })],
  published_at: { type: Date, default: Date.now },
});

const db = Provider;

const save = (data) => new Promise((resolve, reject) => {
  const {
    namespace,
    type,
    version,
    platforms,
  } = data;

  const provider = new Provider({
    namespace,
    type,
    version,
    platforms,
  });

  provider.save()
    .then((newDoc) => {
      debug('saved the provider into db: %o', provider);
      return resolve(newDoc);
    })
    .catch((err) => reject(err));
});

const findAll = ({
  selector = {},
  namespace = '',
  offset = 0,
  limit = 15,
} = {}) => new Promise((resolve, reject) => {
  const options = selector;

  if (namespace) {
    options.namespace = namespace;
  }

  debug('search db with %o', options);
  Provider.find(options)
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

      return Provider.find(options, null, { sort: '_id', skip: +offset, limit: +limit })
        .then((docs) => {
          debug('search result from db: %o', docs);
          return resolve({
            meta,
            providers: docs,
          });
        })
        .catch((err) => reject(err));
    })
    .catch((err) => reject(err));
});

const getVersions = ({
  namespace,
  type,
} = {}) => new Promise((resolve, reject) => {
  if (!namespace) { reject(new Error('namespace required.')); }
  if (!type) { reject(new Error('type required.')); }

  const options = {
    namespace,
    type,
  };

  debug('search versions in db with %o', options);
  Provider.find(options, null, { sort: '_id' })
    .then((docs) => {
      const data = docs;
      debug('search versions result from db: %o', docs);
      return resolve(data);
    })
    .catch((err) => reject(err));
});

const getLatestVersion = async ({
  namespace,
  type,
} = {}) => new Promise((resolve, reject) => {
  if (!namespace) { reject(new Error('namespace required.')); }
  if (!type) { reject(new Error('type required.')); }

  const options = {
    namespace,
    type,
  };

  Provider.find(options, null, { sort: '-version', limit: 1 })
    .then((docs) => {
      debug('search latest version result from db: %o', docs);
      return resolve(docs.length > 0 ? docs[0] : null);
    })
    .catch((err) => reject(err));
});

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
  Provider.find(options)
    .then((docs) => resolve(docs.length > 0 ? docs[0] : null))
    .catch((err) => reject(err));
});

const increaseDownload = async ({
  namespace,
  type,
  version,
  os,
  arch,
} = {}) => new Promise((resolve, reject) => {
  if (!namespace) { reject(new Error('namespace required.')); }
  if (!type) { reject(new Error('type required.')); }
  if (!version) { reject(new Error('version required.')); }
  if (!os) { reject(new Error('os required.')); }
  if (!arch) { reject(new Error('arch required.')); }

  const options = {
    namespace,
    type,
    version,
    'platforms.os': os,
    'platforms.arch': arch,
  };

  Provider.findOneAndUpdate(options, { $inc: { downloads: 1 } }, { new: true })
    .then((doc) => resolve(doc))
    .catch((err) => reject(err));
});

const findProviderPackage = async ({
  namespace,
  type,
  version,
  os,
  arch,
} = {}) => new Promise((resolve, reject) => {
  if (!namespace) { reject(new Error('namespace required.')); }
  if (!type) { reject(new Error('name required.')); }
  if (!version) { reject(new Error('version required.')); }
  if (!os) { reject(new Error('os required.')); }
  if (!arch) { reject(new Error('arch required.')); }

  const options = {
    namespace,
    type,
    version,
    'platforms.os': os,
    'platforms.arch': arch,
  };

  Provider.findOne(options)
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
  findProviderPackage,
};

const mongoose = require('mongoose');
const debug = require('debug')('citizen:server:store:mongodb');

const dbUri = process.env.CITIZEN_MONGO_DB_URI || 'mongodb://localhost:27017/citizen';
mongoose.connect(dbUri, {});

const storeType = 'mongodb';

// modules
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

const saveModule = (data) => {
  const module = new Module(data);
  return module.save();
};

const findModules = (options) => Module.find(options);

const findAllModules = (options, meta, offset, limit) => {
  debug('search store with %o', options);

  return Module.find(options, null, { sort: '_id', skip: offset, limit })
    .then((docs) => {
      debug('search result from store: %o', docs);
      return {
        meta,
        modules: docs,
      };
    });
};

const getModuleVersions = (options) => {
  debug('search versions in store with %o', options);
  return Module.find(options, null, { sort: '_id' });
};

const getModuleLatestVersion = (options) => Module.find(options, null, { sort: '-version', limit: 1 })
  .then((docs) => {
    debug('search latest version result from db: %o', docs);
    return docs.length > 0 ? docs[0] : null;
  });

const findOneModule = async (options) => {
  debug('search a module in store with %o', options);
  return Module.find(options)
    .then((docs) => (docs.length > 0 ? docs[0] : null));
};

const increaseModuleDownload = (options) => Module
  .findOneAndUpdate(options, { $inc: { downloads: 1 } }, { new: true });

// providers
const Provider = mongoose.model('Provider', {
  namespace: String,
  type: String,
  version: String,
  protocols: [String],
  platforms: [new mongoose.Schema({
    os: { type: String },
    arch: { type: String },
    filename: { type: String },
    shasum: { type: String },
  })],
  gpgPublicKeys: [new mongoose.Schema({
    keyId: { type: String },
    asciiArmor: { type: String },
    trustSignature: { type: String },
    source: { type: String },
    sourceUrl: { type: String },
  })],
  published_at: { type: Date, default: Date.now },
});

const saveProvider = (data) => {
  const provider = new Provider(data);
  return provider.save();
};

const findOneProvider = async (options) => {
  debug('search a provider in store with %o', options);
  return Provider.find(options)
    .then((docs) => (docs.length > 0 ? docs[0] : null));
};

const findProviders = (options) => Provider.find(options);

const findAllProviders = (options, meta, offset, limit) => {
  debug('search store with %o', options);

  return Provider.find(options, null, { sort: '_id', skip: offset, limit })
    .then((docs) => {
      debug('search result from store: %o', docs);
      return {
        meta,
        providers: docs,
      };
    });
};

const getProviderVersions = (options) => {
  debug('search versions in store with %o', options);
  return Provider.find(options, null, { sort: 'version' });
};

const findProviderPackage = (options) => Provider
  .find(options, null, { sort: '-version' })
  .then((docs) => (docs.length > 0 ? docs[0] : null));

module.exports = {
  storeType,
  moduleDb: Module,
  saveModule,
  findModules,
  findAllModules,
  getModuleVersions,
  getModuleLatestVersion,
  findOneModule,
  increaseModuleDownload,
  providerDb: Provider,
  saveProvider,
  findOneProvider,
  findProviders,
  findAllProviders,
  getProviderVersions,
  findProviderPackage,
};

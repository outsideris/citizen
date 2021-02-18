const mongoose = require('mongoose');
const debug = require('debug')('citizen:server:store:mongodb');

const connectionOptions = {
  useUnifiedTopology: true,
  useNewUrlParser: true,
  useFindAndModify: false,
};

const dbUri = process.env.CITIZEN_MONGO_DB_URI || 'mongodb://localhost:27017/citizen';
mongoose.connect(dbUri, connectionOptions);

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

  platforms: [new mongoose.Schema({
    os: { type: String },
    arch: { type: String },
    location: { type: String },
    filename: { type: String },
    shasum: { type: String },
  })],
  published_at: { type: Date, default: Date.now },
});

const saveProvider = (data) => {
  const provider = new Provider(data);
  return provider.save();
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

// publisher
const Publisher = mongoose.model('Publisher', {
  name: String,
  url: String,
  trustSignature: String,

  gpgKeys: [new mongoose.Schema({
    keyId: { type: String, required: true },
    asciiArmor: { type: String, required: true },
  })],
  publishedAt: { type: Date, default: Date.now },
});

const savePublisher = (data) => {
  const publisher = new Publisher(data);
  return publisher.save();
}

const updatePublisher  = async (data) => {
  const publisher = await findOne({ name: data.name });
  if (!publisher) {
    throw new Error(`Could not find publisher with name ${data.name}`);
  }

  // eslint-disable-next-line no-underscore-dangle
  return Publisher.updateOne({ _id: publisher._id }, { $set: data });
};

const findPublishers = (options) => Publisher.find(options);

const findAllPublishers = (options, meta, offset, limit) => {
  debug('search store with %o', options);

  return Publisher.find(options, null, { sort: '_id', skip: offset, limit })
    .then((docs) => {
      debug('search result from store: %o', docs);
      return {
        meta,
        providers: docs,
      };
    });
};

const findOnePublisher = async (options) => {
  debug('search a module in store with %o', options);
  return Publisher.find(options)
    .then((docs) => (docs.length > 0 ? docs[0] : null));
};

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
  findProviders,
  findAllProviders,
  getProviderVersions,
  findProviderPackage,
  publisherDb: Publisher,
  savePublisher,
  findPublishers,
  findAllPublishers,
  findOnePublisher,
};

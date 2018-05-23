const Datastore = require('nedb');
const uuid = require('uuid/v1');
const debug = require('debug')('citizen:server');

const db = new Datastore({ filename: 'data/citizen.db', autoload: true });

const save = data =>
  new Promise((resolve, reject) => {
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
      _id: `${uuid()}`,
      owner: owner || '',
      namespace,
      name,
      provider,
      version,
      location,
      downloads: 0,
      published_at: new Date(),
      root: definition.root,
      submodules: definition.submodules,
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

    return db.find(options).sort({ _id: 1 }).skip(+offset).limit(+limit)
      .exec((error, docs) => {
        if (error) { return reject(err); }

        debug('search result from db: %o', docs);
        return resolve({
          meta,
          modules: docs,
        });
      });
  });
});

const getVersions = ({ namespace, name, provider } = {}) =>
  new Promise((resolve, reject) => {
    if (!namespace) { reject(new Error('namespace required.')); }
    if (!name) { reject(new Error('name required.')); }
    if (!provider) { reject(new Error('provider required.')); }

    const options = {
      namespace,
      name,
      provider,
    };

    debug('search versions in db with %o', options);
    db.find(options).sort({ _id: 1 }).exec((err, docs) => {
      if (err) { return reject(err); }

      const data = docs.map(d => ({
        version: d.version,
        submodules: d.submodules,
        root: d.root,
      }));
      debug('search versions result from db: %o', docs);
      return resolve(data);
    });
  });

const getLatestVersion = async ({ namespace, name, provider } = {}) =>
  new Promise((resolve, reject) => {
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
  });

const findOne = async ({
  namespace,
  name,
  provider,
  version,
} = {}) =>
  new Promise((resolve, reject) => {
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
} = {}) =>
  new Promise((resolve, reject) => {
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
};

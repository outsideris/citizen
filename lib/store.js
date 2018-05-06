const PouchDB = require('pouchdb');
const uuid = require('uuid/v1');
const debug = require('debug')('citizen:server');

PouchDB.plugin(require('pouchdb-find'));

const db = new PouchDB('citizen-db');

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

    db.put(module, (err, result) => {
      if (err) { return reject(err); }
      debug('saved the module into db: %o', module);
      return resolve(result);
    });
  });

const findAll = async ({
  selector = {},
  namespace = '',
  provider = '',
  offset = 0,
  limit = 15,
} = {}) => {
  const options = {
    selector,
    sort: ['_id'],
    skip: +offset,
    limit: +limit,
  };

  if (namespace) {
    options.selector = { namespace: { $eq: namespace } };
  }
  if (provider) {
    options.selector = { provider: { $eq: provider } };
  }

  debug('search db with %o', options);

  const allDocs = await db.allDocs();
  const totalRows = allDocs.total_rows;

  const meta = {
    limit: +limit,
    currentOffset: +offset,
    nextOffset: +offset + +limit,
    prevOffset: +offset - +limit,
  };
  if (meta.prevOffset < 0) { meta.prevOffset = null; }
  if (meta.nextOffset >= totalRows) { meta.nextOffset = null; }

  const result = await db.find(options);
  debug('search result from db: %o', result);
  return {
    meta,
    modules: result.docs,
  };
};

const getVersions = async ({ namespace, name, provider } = {}) => {
  if (!namespace) { throw new Error('namespace required.'); }
  if (!name) { throw new Error('name required.'); }
  if (!provider) { throw new Error('provider required.'); }

  const options = {
    selector: {
      namespace: { $eq: namespace },
      name: { $eq: name },
      provider: { $eq: provider },
    },
    sort: ['_id'],
  };

  debug('search versions in db with %o', options);
  const result = await db.find(options);
  debug('search versions result from db: %o', result);

  return result.docs.map(d =>
    ({
      version: d.version,
      submodules: d.submodules,
      root: d.root,
    }));
};

const getLatestVersion = async ({ namespace, name, provider } = {}) => {
  if (!namespace) { throw new Error('namespace required.'); }
  if (!name) { throw new Error('name required.'); }
  if (!provider) { throw new Error('provider required.'); }

  const options = {
    selector: {
      namespace: { $eq: namespace },
      name: { $eq: name },
      provider: { $eq: provider },
      version: { $gt: '0' },
    },
    sort: [{ version: 'desc' }],
    limit: 1,
  };

  debug('search latests version in db with %o', options);

  await db.createIndex({
    index: { fields: ['version'] },
  });

  const module = await db.find(options);
  debug('search latest version result from db: %o', module);

  return module.docs.length > 0 ? module.docs[0] : null;
};

const findOne = async ({
  namespace,
  name,
  provider,
  version,
} = {}) => {
  if (!namespace) { throw new Error('namespace required.'); }
  if (!name) { throw new Error('name required.'); }
  if (!provider) { throw new Error('provider required.'); }
  if (!version) { throw new Error('version required.'); }

  const options = {
    selector: {
      namespace: { $eq: namespace },
      name: { $eq: name },
      provider: { $eq: provider },
      version: { $eq: version },
    },
  };

  debug('search a module in db with %o', options);
  const module = await db.find(options);
  debug('search a module result from db: %o', module);

  return module.docs.length > 0 ? module.docs[0] : null;
};

const increaseDownload = async ({
  namespace,
  name,
  provider,
  version,
} = {}) => {
  if (!namespace) { throw new Error('namespace required.'); }
  if (!name) { throw new Error('name required.'); }
  if (!provider) { throw new Error('provider required.'); }
  if (!version) { throw new Error('version required.'); }

  const options = {
    selector: {
      namespace: { $eq: namespace },
      name: { $eq: name },
      provider: { $eq: provider },
      version: { $eq: version },
    },
  };

  const doc = await db.find(options);
  const curDoc = doc.docs[0];
  if (!curDoc) {
    return null;
  }

  curDoc.downloads += 1;
  await db.put(curDoc);

  const result = await db.get(curDoc._id); // eslint-disable-line no-underscore-dangle
  return result;
};

module.exports = {
  db,
  save,
  findOne,
  findAll,
  getVersions,
  getLatestVersion,
  increaseDownload,
};

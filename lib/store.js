const PouchDB = require('pouchdb');
const uuid = require('uuid/v1');

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
    } = data;

    const module = {
      _id: `${uuid()}`,
      owner: owner || '',
      namespace,
      name,
      provider,
      version,
      location,
      published_at: new Date(),
    };

    db.put(module, (err, result) => {
      if (err) { return reject(err); }
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

  const result = await db.find(options);

  return result.docs.map(d =>
    ({
      version: d.version,
      submodules: [],
      root: {},
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

  await db.createIndex({
    index: { fields: ['version'] },
  });

  const module = await db.find(options);

  return module.docs.length > 0 ? module.docs[0] : null;
};

module.exports = {
  db,
  save,
  findAll,
  getVersions,
  getLatestVersion,
};

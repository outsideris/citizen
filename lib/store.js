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
    } = data;

    const module = {
      _id: `${uuid()}`,
      owner: owner || '',
      namespace,
      name,
      provider,
      version,
      published_at: new Date(),
    };

    db.put(module, (err, result) => {
      if (err) { return reject(err); }
      return resolve(result);
    });
  });

const findAll = async ({ namespace = '', provider = '', offset = 0, limit = 15 } = {}) => {
  const options = {
    selector: {},
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

module.exports = {
  db,
  save,
  findAll,
};

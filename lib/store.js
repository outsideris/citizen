const PouchDB = require('pouchdb');

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
      _id: `${(new Date()).getTime()}`,
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

module.exports = {
  save,
};

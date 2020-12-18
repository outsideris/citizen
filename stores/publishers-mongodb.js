const debug = require('debug')('citizen:server');
const mongoose = require('./mongoose-setup');

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

const db = Publisher;

const save = (data) => new Promise((resolve, reject) => {
  const {
    name,
    url,
    trustSignature,
    gpgKeys,
  } = data;

  if (!name) { reject(new Error('name required.')); }
  if (!gpgKeys) { reject(new Error('gpgKeys required.')); }

  const publisher = new Publisher({
    name,
    url,
    trustSignature,
    gpgKeys,
  });

  publisher.save()
    .then((newDoc) => {
      debug('saved the publisher into db: %o', publisher);
      return resolve(newDoc);
    })
    .catch((err) => reject(err));
});

const findAll = ({
  selector = {},
  offset = 0,
  limit = 15,
} = {}) => new Promise((resolve, reject) => {
  const options = selector;

  debug('search db with %o', options);
  Publisher.find(options)
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

      return Publisher.find(options, null, { sort: '_id', skip: +offset, limit: +limit })
        .then((docs) => {
          debug('search result from db: %o', docs);
          return resolve({
            meta,
            publishers: docs,
          });
        })
        .catch((err) => reject(err));
    })
    .catch((err) => reject(err));
});

const findOne = async ({
  name,
} = {}) => new Promise((resolve, reject) => {
  if (!name) { reject(new Error('name required.')); }

  const options = {
    name,
  };

  debug('search a publisher in db with %o', options);
  Publisher.find(options)
    .then((docs) => resolve(docs.length > 0 ? docs[0] : null))
    .catch((err) => reject(err));
});

const update = async (data) => {
  const publisher = await findOne({ name: data.name });
  if (!publisher) {
    throw new Error(`Could not find publisher with name ${data.name}`);
  }

  return Publisher.updateOne({ _id: publisher._id }, { $set: data });
};

module.exports = {
  db,
  save,
  update,
  findOne,
  findAll,
};

const mongoose = require('mongoose');
const debug = require('debug')('citizen:server:store:mongodb');

const connectionOptions = {
  useUnifiedTopology: true,
  useNewUrlParser: true,
  useFindAndModify: false,
};

const dbUri = process.env.CITIZEN_MONGO_DB_URI || 'mongodb://localhost:27017/citizen';
mongoose.connect(dbUri, connectionOptions);

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

const type = 'mongodb';

const saveModule = (data) => new Promise((resolve, reject) => {
  const module = new Module(data);

  module.save()
    .then((newDoc) => {
      debug('saved the module into db: %o', module);
      return resolve(newDoc);
    })
    .catch((err) => reject(err));
});

module.exports = {
  type,
  moduleDb: Module,
  saveModule,
};

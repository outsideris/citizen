const nock = require('nock');

module.exports = {
  enableMock: ({ modulePath }) => {
    console.log(modulePath);
    if (process.env.CITIZEN_MOCK_ENABLED) {
      nock('https://www.googleapis.com/oauth2/v4/token')
        .persist()
        .post('')
        .reply(200);

      nock('https://www.googleapis.com/upload/storage/v1')
        .persist()
        .post(`/b/${process.env.CITIZEN_GCP_GCS_BUCKET}/o`, {})
        .query({ name: modulePath, uploadType: 'resumable' })
        .reply(200);

      nock('https://www.googleapis.com/storage/v1')
        .persist()
        .get(`/b/${process.env.CITIZEN_GCP_GCS_BUCKET}/o/${modulePath}?`)
        .reply(200, {})
        .get(`/b/${process.env.CITIZEN_GCP_GCS_BUCKET}/o/${modulePath}/wrong?`)
        .reply(404, {})
        .get(`/b/${process.env.CITIZEN_GCP_GCS_BUCKET}/o/${modulePath}?`)
        .query({ alt: 'media' })
        .reply(200, {});
    }
  },
  clearMock: () => {
    if (process.env.CITIZEN_MOCK_ENABLED) {
      nock.cleanAll();
    }
  },
};
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
        .reply(404, {
          "kind": "storage#object",
          "id": "citizen-test/package.json/1548899004933150",
          "selfLink": "https://www.googleapis.com/storage/v1/b/citizen-test/o/package.json",
          "name": "package.json",
          "bucket": "citizen-test",
          "generation": "1548899004933150",
          "metageneration": "1",
          "timeCreated": "2019-01-31T01:43:24.932Z",
          "updated": "2019-01-31T01:43:24.932Z",
          "storageClass": "MULTI_REGIONAL",
          "timeStorageClassUpdated": "2019-01-31T01:43:24.932Z",
          "size": "1648",
          "md5Hash": "2VfaltwFQPTnuzqT7AGRSg==",
          "mediaLink": "https://www.googleapis.com/download/storage/v1/b/citizen-test/o/package.json?generation=1548899004933150&alt=media",
          "crc32c": "lzLVrA==",
          "etag": "CJ7I7bfyluACEAE="
        })
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
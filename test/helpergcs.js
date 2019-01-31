const nock = require('nock');

module.exports = {
  enableMock: ({ modulePath }) => {
    if (process.env.CITIZEN_MOCK_ENABLED) {
      nock('https://www.googleapis.com/oauth2/v4/token')
        .persist()
        .post('')
        .reply(200);

      nock('https://www.googleapis.com/upload/storage/v1')
        .persist()
        .post(`/b/${process.env.CITIZEN_GCP_GCS_BUCKET}/o`, {})
        .query({ name: modulePath, uploadType: 'resumable' })
        .reply(200,
          '',
          ['Location', `https://www.googleapis.com/upload/storage/v1/b/${process.env.CITIZEN_GCP_GCS_BUCKET}/o?uploadType=resumable&upload_id=test`,
            'Content-Length', '0'])
        .put(`/b/${process.env.CITIZEN_GCP_GCS_BUCKET}/o`, '1f8b0800000000000013ed914b0e80200c44398a2730e5d3f63c1a5de8c604f4fe0a8a9fad86c882b799124833cc34f5e8446200808ca9bc32615050fbf9a012522b498cc46404484de4ef531bf32c6e6eec66655a663774bd7dbb277e246a069c99b28c3383d68f376d6efd3384fe194aff5fb932c55bfff8b7ad42a190092b8873dc2c00080000')
        .query({ uploadType: 'resumable', upload_id: 'test' })
        .reply(201, '',
          ['etag', 'CJC80JvwmOACEAE=',
            'x-guploader-uploadid', 'AEnB2UpdJNvPsgmUKgb2icFnCThsv_iQkrI0BqC3h9V6iEJlFVAYH3xN0xrtU76vUJat3YJLsov1W1NHFiBr5qhQjuDKJDOaYg',
            'x-goog-generation', '1548967128342032',
            'x-goog-metageneration', '1',
            'x-goog-hash', 'crc32c=CFm9Ug==,md5=7RaLYRTbX1TTi7G9m6RRBg==',
            'x-goog-storage-class', 'MULTI_REGIONAL']);

      nock('https://www.googleapis.com/storage/v1')
        .persist()
        .get(`/b/${process.env.CITIZEN_GCP_GCS_BUCKET}/o/${modulePath}?`)
        .reply(200, '')
        .get(`/b/${process.env.CITIZEN_GCP_GCS_BUCKET}/o/${modulePath}.wrong?`)
        .reply(404, '')
        .get(`/b/${process.env.CITIZEN_GCP_GCS_BUCKET}/o/${modulePath}`)
        .query({ alt: 'media' })
        .reply(200,
          '',
          ['etag', 'CJC80JvwmOACEAE=',
            'x-guploader-uploadid', 'AEnB2UpdJNvPsgmUKgb2icFnCThsv_iQkrI0BqC3h9V6iEJlFVAYH3xN0xrtU76vUJat3YJLsov1W1NHFiBr5qhQjuDKJDOaYg',
            'x-goog-generation', '1548967128342032',
            'x-goog-metageneration', '1',
            'x-goog-hash', 'crc32c=CFm9Ug==,md5=7RaLYRTbX1TTi7G9m6RRBg==',
            'x-goog-storage-class', 'MULTI_REGIONAL']);
    }
  },
  clearMock: () => {
    if (process.env.CITIZEN_MOCK_ENABLED) {
      nock.cleanAll();
    }
  },
};

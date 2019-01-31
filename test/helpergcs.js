const nock = require('nock');

module.exports = {
  enableMock: ({ modulePath }) => {
    if (process.env.CITIZEN_MOCK_ENABLED) {
      nock('https://storage.googleapis.com')
        .persist()
        .put(`/${process.env.CITIZEN_AWS_S3_BUCKET}/${modulePath}`)
        .reply(
          200,
          ['x-guploader-uploadid', 'AEnB2UqkEQCrSfUftzPAeZsQlQkaGEWWPM-rai3qLiXxmv-2AgQfjKq169_rZ1bEzb46M2CgFW61_uUDlcFfOakaUsJgQom2mA',
            'etag', '"d957da96dc0540f4e7bb3a93ec01914a"',
            'x-goog-generation', '1548890435877949',
            'x-goog-metageneration', '1',
            'x-goog-hash', 'crc32c=lzLVrA==',
            'x-goog-stored-content-length', '1648',
            'content-length', '0',
            'date', 'Wed, 30 Jan 2019 23:20:35 GMT',
            'server', 'UploadServer',
            'content-type', 'text/html; charset=UTF-8'],
        );
    }
  },
  clearMock: () => {
    if (process.env.CITIZEN_MOCK_ENABLED) {
      nock.cleanAll();
    }
  },
};

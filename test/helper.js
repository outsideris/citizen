const nock = require('nock');
const fs = require('fs');

module.exports = {
  enableMock: ({ modulePath }) => {
    if (process.env.CITIZEN_MOCK_ENABLED) {
      nock('https://s3.amazonaws.com')
        .persist()
        .put(`/${process.env.CITIZEN_AWS_S3_BUCKET}/${modulePath}`)
        .reply(
          301,
          `<?xml version="1.0" encoding="UTF-8"?>\n<Error><Code>PermanentRedirect</Code><Message>The bucket you are attempting to access must be addressed using the specified endpoint. Please send all future requests to this endpoint.</Message><Bucket>${process.env.CITIZEN_AWS_S3_BUCKET}</Bucket><Endpoint>${process.env.CITIZEN_AWS_S3_BUCKET}.s3.amazonaws.com</Endpoint><RequestId>66E7A19ACCD7B823</RequestId><HostId>GWudIHA65prhHIpG5drFq6BG0fQsB5nKTnYtLFl0UZ/6MBrAwOJQdRzEDj88kSNmDCGFgzE3Y+c=</HostId></Error>`,
          ['x-amz-bucket-region', 'ap-northeast-1',
            'x-amz-request-id', '66E7A19ACCD7B823',
            'x-amz-id-2', 'GWudIHA65prhHIpG5drFq6BG0fQsB5nKTnYtLFl0UZ/6MBrAwOJQdRzEDj88kSNmDCGFgzE3Y+c=',
            'Content-Type', 'application/xml',
            'Transfer-Encoding', 'chunked',
            'Date', 'Mon, 21 May 2018 13:12:55 GMT',
            'Connection', 'close',
            'Server', 'AmazonS3'],
        );

      nock('https://s3.ap-northeast-1.amazonaws.com')
        .persist()
        .put(`/${process.env.CITIZEN_AWS_S3_BUCKET}/${modulePath}?x-id=PutObject`)
        .reply(
          200,
          '',
          ['x-amz-id-2', 'svpKcyIH+XuAnlZIypbIbRnp6XNd6swNlKuFEV3soIRd2Imr+1nmnp2L4gcEbqP+eKU3MHUugdE=',
            'x-amz-request-id', '6E659346AF7425E4',
            'Date', 'Sun, 21 Jan 2018 12:50:17 GMT',
            'ETag', '"ed168b6114db5f54d38bb1bd9ba45106"',
            'Content-Length', '0',
            'Server', 'AmazonS3'],
        )
        .get(`/${process.env.CITIZEN_AWS_S3_BUCKET}/${modulePath}?x-id=GetObject`)
        .reply(
          200,
          fs.createReadStream(`${__dirname}/fixture/test.tar.gz`),
          ['x-amz-id-2', 'UTXd/Ac9Lpf5htlqmY7jIa//st0VNw3HiV0H2tFpjQrabzdF0a1A0RXwaXXEDJsSMC0z9ieqSJg=',
            'x-amz-request-id', '51DCE049BC4189E5',
            'Date', 'Sun, 21 Jan 2018 16:47:35 GMT',
            'Last-Modified', 'Sun, 21 Jan 2018 16:47:35 GMT',
            'ETag', '"ed168b6114db5f54d38bb1bd9ba45106"',
            'Accept-Ranges', 'bytes',
            'Content-Type', 'application/octet-stream',
            'Content-Length', '136',
            'Server', 'AmazonS3'],
        )
        .get(`/${process.env.CITIZEN_AWS_S3_BUCKET}/${modulePath}/wrong?x-id=GetObject`)
        .reply(
          404,
          '<?xml version="1.0" encoding="UTF-8"?>\n<Error><Code>NoSuchKey</Code><Message>The specified key does not exist.</Message><Key>citizen/1516553253143/test.tar.gz/wrong</Key><RequestId>CA3688C9219019B8</RequestId><HostId>HoNack5lolKkIbPaGJADKOA1jLDxlP/G1gJMdi9Xc3j5WSaeHJphz/uqVLqDrMjA24W/8+kvJXM=</HostId></Error>',
          ['x-amz-request-id', 'CA3688C9219019B8',
            'x-amz-id-2', 'HoNack5lolKkIbPaGJADKOA1jLDxlP/G1gJMdi9Xc3j5WSaeHJphz/uqVLqDrMjA24W/8+kvJXM=',
            'Content-Type', 'application/xml',
            'Transfer-Encoding', 'chunked',
            'Date', 'Sun, 21 Jan 2018 16:47:34 GMT',
            'Server', 'AmazonS3'],
        )
        .delete(`/${process.env.CITIZEN_AWS_S3_BUCKET}/${modulePath}?x-id=DeleteObject`)
        .reply(
          204,
          '',
          ['x-amz-id-2', 'S0/qBL0imAEhHXwySaB9UxDzA025VeonKZa7A4lP5LZgDC6jiYRhmb5gpRhbbOO6e+SkfvVSLh0=',
            'x-amz-request-id', 'B9DB7B4B906399D7',
            'Date', 'Sun, 21 Jan 2018 12:50:18 GMT',
            'Server', 'AmazonS3'],
        );
    }
  },
  clearMock: () => {
    if (process.env.CITIZEN_MOCK_ENABLED) {
      nock.cleanAll();
    }
  },
  deleteDbAll: (db) => new Promise((resolve, reject) => {
    db.remove({}, { multi: true }, (err, numRemoved) => {
      if (err) { return reject(err); }
      return resolve(numRemoved);
    });
  }),
  deleteDbAllMongo: (db) => new Promise((resolve, reject) => {
    db.deleteMany({})
      .then((doc) => resolve(doc))
      .catch((err) => reject(err));
  }),
};

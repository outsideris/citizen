const crypto = require('node:crypto');
const { writeFile } = require('node:fs/promises');
const nock = require('nock');

module.exports = {
  enableGCSMock: (bucket, uid) => {
    // nock.recorder.rec();
    nock('https://www.googleapis.com', { encodedQueryParams: true }).persist().post('/oauth2/v4/token').reply(200);

    nock('https://storage.googleapis.com', { encodedQueryParams: true })
      .post(`/upload/storage/v1/b/${bucket}/o`)
      .query(true)
      .reply(function reply() {
        const qs = this.req.path.split('?')[1];
        const name = new URLSearchParams(qs).get('name');
        return [
          200,
          '',
          {
            Location: `https://storage.googleapis.com/upload/storage/v1/b/${bucket}/o?name=${name}&uploadType=resumable&upload_id=abcdef`,
          },
        ];
      })

      .put(`/upload/storage/v1/b/${bucket}/o`)
      .query(true)
      .reply(function reply() {
        const body = {};
        if (this.req.path.includes('module')) {
          body.crc32c = 'ZzfQig==';
        } else if (this.req.path.includes('provider')) {
          body.crc32c = 'AAAAAA==';
        }
        return [200, body, []];
      });

    nock('https://storage.googleapis.com', { encodedQueryParams: true })
      .filteringPath((path) => path.replace(/(provider|module)/g, 'both-test'))
      .get(`/storage/v1/b/${bucket}/o/both-tests%2F${uid}%2Fboth-test.tar.gz?`)
      .reply(200, { name: `file.tar.gz` }, [])

      .get(`/storage/v1/b/${bucket}/o/both-tests%2F${uid}%2Fboth-test.tar.gz%2Fwrong?`)
      .reply(
        404,
        {
          error: {
            code: 404,
            message: `No such object: ${bucket}/modules/${uid}/module.tar.gz/wrong`,
          },
        },
        [],
      )

      .get(`/storage/v1/b/${bucket}/o/both-tests%2F${uid}%2Fboth-test.tar.gz`)
      .query({ alt: 'media' })
      .reply(200, 'content', ['X-Goog-Hash', 'crc32c=ZzfQMw==,md5=m8alEO53JXbxkixfABpiSA==']);
  },
  disableGCSMock: () => {
    nock.cleanAll();
  },
  generateTestCredentials: async () => {
    const { privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 1024,
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });
    await writeFile(
      'test-credentials.json',
      JSON.stringify({
        project_id: 'test-project-1234',
        private_key: privateKey,
        client_email: '1234-test@developer.gserviceaccount.com',
      }),
    );
  },
};

const request = require('supertest');

const app = require('../../app');

describe('GET /v1/modules/:namespace/:name/:provider/versions', () => {
  it('should return as application/json', () => request(app)
    .get('/v1/modules/hashicorp/consul/aws/versions')
    .expect('Content-Type', /application\/json/)
    .expect(200));
});

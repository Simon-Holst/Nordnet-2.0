const request = require('supertest');
const app = require('../server.js'); 
const { expect } = require('chai');

describe('Auth Routes', () => {

  // Test: Login med korrekt information
  it('Should log in with correct information', (done) => {
    request(app)
      .post('/api/auth/login')
      .send({
        username: 'admin',
        password: '1234'
      })
      .expect(200) 
      .expect((res) => {
        if (!res.body.message) {
          throw new Error('Login failed');
        }
      })
      .end(done);
  });

  // Test: Login med forkert information
  it('Should not log in with wrong information', (done) => {
    request(app)
      .post('/api/auth/login')
      .send({
        username: 'wronguser',
        password: 'wrongpassword'
      })
      .expect(401) 
      .expect((res) => {
        if (!res.body.error) {
          throw new Error('Expected an error message');
        }

        expect(res.body.error).to.equal('Invalid credentials');
      })
      .end(done);
  });
});


const request = require('supertest');
const app = require('../server.js'); // Importer din server
const { expect } = require('chai');


describe('Auth routes', () => {
  it('Should log in with correct information', (done) => {
    request(app)
      .post('/api/auth/login')
      .send({
        username: 'admin',
        password: '1234'
      })
      .expect(200)
      .expect(res =>{
        if(!res.body.message){
            throw new Error('Login failed');
        }
      })
      .end(done)
      });
  });

  it('Should not log in with wrong information', (done) => {
    request(app)
      .post('/api/auth/login')
      .send({
        username: 'wronguser',
        password: 'wrongpassword'
      })
      .expect(401)
      .end((err, res) => {
        if (err) return done(err);

        // Tjekker om fejlbeskeden er korrekt
        expect(res.body.error).to.equal('Wrong username or password');
        done();
      });
  });

  

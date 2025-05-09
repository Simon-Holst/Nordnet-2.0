const request = require('supertest');
const app = require('../server.js'); 
const { expect } = require('chai');
const {poolPromise} = require('../Backend/SQL/database.js');

describe('Register routes', () => {
  // Test: Register bruger som ikke findes
    it('Should register a new user with correct information', (done) => {
      request(app)
        .post('/api/auth/register')
        .send({
          username: 'newUser',
          password: 'testPassword',
          email: 'newuser@example.com'
        })
        .expect(201)
        .expect(res => {
          if (!res.body.message) {
            throw new Error('Registration failed');
          }
        })
        .end(done);
    });
  // Test: Register bruger som allerede findes
    it('Should not register a user with an existing username', (done) => {
      request(app)
        .post('/api/auth/register')
        .send({
          username: 'admin', // admin findes
          password: 'testPassword',
          email: 'admin@example.com'
        })
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
  
          expect(res.body.error).to.equal('User creation failed: Username or email already taken');
          done();
        });
    });

    // Sletter brugeren direkte i databasen
    after(async () => {
        try {
          const pool = await poolPromise;
          await pool.request()
            .input('username', 'newUser')
            .query('DELETE FROM PortfolioTracker.[User] WHERE username = @username');
          console.log("Test user successfully deleted.");
        } catch (err) {
          console.error("Error deleting test user:", err.message);
        }
      });
  });

  
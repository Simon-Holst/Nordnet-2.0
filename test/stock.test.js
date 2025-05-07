const request = require('supertest');
const app = require('../server.js'); // Importer din server
const { expect } = require('chai');

describe('Stock Routes', () => {

  // Test: Henter aktuel aktiekurs med korrekt symbol
  it('Should fetch the current stock price with a valid symbol', (done) => {
    request(app)
      .get('/api/stocks/AAPL') // her tester vi med Apple som eksempel
      .expect(200) // Forventer en 200 OK
      .expect((res) => {
        expect(res.body).to.have.property('symbol', 'AAPL');
        expect(res.body).to.have.property('price');
        expect(res.body.price).to.be.a('number');
      })
      .end(done);
  });

  // Test: Håndterer fejl, hvis symbolet ikke eksisterer
  it('Should return 500 if symbol does not exist', (done) => {
    request(app)
      .get('/api/stocks/INVALIDSYMBOL')
      .expect(500) 
      .expect((res) => {
        expect(res.body).to.have.property('error', 'Could not fetch stock data');
      })
      .end(done);
  });
});

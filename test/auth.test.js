const express = require('express')
const request = require('supertest')
const {poolPromise} = require('../SQL/database.js')
const expect = require('chai').expect
const authRoutes = require('../Backend/routes/authRoutes.js')
const app = express()

app.use(express.json())
app.use('/api/auth', authRoutes)



describe('Auth routes', () => {
    it('It should log in with correct information', (done) => {
        expect(currencyConverator).to.equal(2)
        done()
    })
})
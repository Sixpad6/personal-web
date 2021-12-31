const { Pool } = require('pg')

const dbPool = new Pool({
    database: 'personal_web',
    port: 5432,
    user: 'postgres',
    password: 'root'
})

module.exports = dbPool

const heroku = new Pool({
    database: 'dcm072kbnclvvs',
    port: 5432,
    user: 'rtnkeocbygwbov',
    password: '42c35fa4bdfc64eceaa10b80ffa28c99953a4c57980db8de1e753e812922e72c',
    host: 'ec2-52-70-205-234.compute-1.amazonaws.com',
    dialect: 'postgres'
})

module.exports = heroku
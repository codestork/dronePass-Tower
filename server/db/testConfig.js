var pg = require('knex')({
  client: 'pg',
  connection: {
    host     : 'localhost',
    user     : 'dronepass',
    password : 'laddladd',
    database : 'dronepasstest'
  },debug: true
});

module.exports = pg;
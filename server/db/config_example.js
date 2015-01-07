var connString = 'postgres://username:password@address/database';
var pg = require('knex')({
  client: 'pg',
  connection: connString
})

module.exports = pg;

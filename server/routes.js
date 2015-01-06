var utils = require('./db/utils');

module.exports = {
  'test1': {
    get: function(req, res){
      console.log('GETTING THE STUFF')
      res.status(200).send('hello world');
    },
    post: function(req, res){
      res.status(200).send('whut');
    }
  }

}
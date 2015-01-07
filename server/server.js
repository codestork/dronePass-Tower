var request = require('request');

var port = process.env.PORT || 3000;
var io = require('socket.io')(port);

io.on('connection', function(socket){

  socket.emit('whoYouAre',{});

  // Simple test socket communication
  socket.on('tellMyName', function(msg){
    socket.emit('greetings', 'hello world' + msg.name); // emit with a string!
  });

});


// Client Example
// var socket = io.connect('http://server:port');
//
// socket.on('whoYouAre', function(msg){
//   socket.emit('tellMyName', { name:"Bob" }); // emit with an object!
// });

// socket.on('greetings', function(msg){
//   console.log(msg);
// });

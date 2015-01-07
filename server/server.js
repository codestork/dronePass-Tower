var request = require('request');

var port = process.env.PORT || 8080;
var io = require('socket.io')(port);

var say = function(msg) {
  console.log(msg);
  // push to some MQ or other storages for TTS
}

io.on('connection', function(socket){

  socket.emit('whoYouAre',{});

  // Simple test socket communication
  socket.on('tellMyName', function(msg){
    socket.emit('greetings', 'hello world ' + msg.name); // emit with a string!
  });

  socket.on('update', function(msg){
    say(msg.transcript)
    // store in local data structure(memory)
    // potentially array of objects
  });

  socket.on('ack', function(msg){
    say(msg.transcript)
  });

  // request drones to report in every N seconds

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


// FlightPathCheck() {
//   pull restriction data from db;
//   calculate
//   notifies drones if anything goes wrong
// }
// setInterval(FlightPathCheck, 1500);

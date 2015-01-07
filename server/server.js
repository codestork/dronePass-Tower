var request = require('request');

var port = process.env.PORT || 8080;
var io = require('socket.io')(port);

var say = dSay = tSay = function(msg) {
  console.log(msg);
  // push to some MQ or other storages for TTS
}

io.on('connection', function(socket){

  socket.emit('whoYouAre',{});

  // Simple test socket communication
  socket.on('tellMyName', function(msg){
    socket.emit('greetings', 'hello world ' + msg.name); // emit with a string!
  });


  socket.on('DT_update', function(msg){
    dSay(msg.transcript);
    // store in local data structure(memory)
    // potentially array of objects
  });

  socket.on('DT_ack', function(msg){
    dSay(msg.transcript);
  });

  socket.on('DT_register', function(msg){
    dSay(msg.transcript);
    // put msg in local memory
    //    msg has {callSign, droneType, location,
    //    speed, prevPathPtInd, distance, statusCode}
    //
    // socket.emit('TD_fileInFlightPlan');
  });

  socket.on('DT_fileInFlightPlan', function(msg){
    dSay(msg.transcript);
    // put msg in local memory
    //    msg has {path}
    //
    // check flight path
    // socket.emit('TD_flightPlanDecision', {path, approved(boolean)});
  });

  socket.on('DT_readyTakeOff', function(msg){
    dSay(msg.transcript);
    // put msg in local memory
    //    msg has {}
    //
    // (maybe add some checks/tests)
    // socket.emit('TD_takeOff')
  });

  // On detect restriction zone 3 min ahead (interval check?)
  // tSay(transcript)
  // socket.emit('TD_notify',{transcript})
  //
  // On reroute creation
  // socket.emit('TD_changeRoute', {pivotPointInd, substitutePath})

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

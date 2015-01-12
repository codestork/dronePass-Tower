var request = require('request');
var utils = require('./db/utils');

var port = process.env.PORT || 8080;
var io = require('socket.io')(port);

var dSay = function(msg) {
  console.log(msg);
  // push to some MQ or other storages for TTS
}

var tSay = function(msg) {
  console.log(msg);
  // push to some MQ or other storages for TTS
}

// Drones that we are currently connected with
var drones = {};

io.on('connection', function(socket){

  // socket.emit('whoYouAre',{});

  // Simple test socket communication
  socket.on('tellMyName', function(msg){
    socket.emit('greetings', 'hello world ' + msg.name); // emit with a string!
  });


//*********************************************************
// Client Server Communication
//*********************************************************

  socket.on('CT_allDronesState', function(msg){
    socket.emit('update', drones);
  });

  
  socket.on('DT_addFlightPath', function(request) {
  /* input:  request.drone_id,  the id of the associated drone
          request.drone_operator_id, the id of the associated operator
          request.flight_start, the ISO string for the start date of the flight
          request.flight_end, the ISO string for th end date for the flight
          request.flightPathWGS84 the GeoJSON string for the proposed geometry.*/


 });


//*********************************************************
// Drone Communication
//*********************************************************

  socket.on('DT_update', function(msg){
    dSay(msg.transcript);
    drones[msg.callSign] = msg;

    for ( d in drones ) {
      console.log(drones[d]);
    }
  });


  socket.on('DT_ack', function(msg){
    dSay(msg.transcript);
  });


  socket.on('DT_register', function(msg){
    dSay(msg.transcript);
    drones[msg.callSign] = msg;

    socket.emit('TD_fileInFlightPlan');
  });


  socket.on('DT_fileInFlightPlan', function(msg){
    dSay(msg.transcript);
    drones[msg.callSign] = msg;

    // check flight path
    // var approved = utils.checkPathConflicts(path stuff);
    utils.getPathConflicts(request).exec(function(err, pathConflicts) {
      if (err) {
        socket.emit('TD_flightPlanDecision', {approved: false, error: err});
      }
      else if (pathConflicts.length === 0) {
        utils.addFlightPath(request).exec(function(err, pathInfo) {
          if (err) {
            socket.emit('TD_flightPlanDecision', {approved: false, error: err});
          } else {
            socket.emit('TD_flightPlanDecision', {approved: true});
          }
        });
      } else {
        socket.emit('TD_flightPlanDecision', {approved: false, pathConflicts: pathConflicts});
      }
    });


    socket.emit('TD_flightPlanDecision', {approved: true});
  });


  socket.on('DT_readyTakeOff', function(msg){
    dSay(msg.transcript);
    drones[msg.callSign] = msg;

    // maybe add some checks/tests b4 take off
    socket.emit('TD_takeOff')
  });


  // Tower requests all drones for an update every 4 seconds
  setInterval(function(){
    socket.emit('TD_update', {});
  }, 4000);

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

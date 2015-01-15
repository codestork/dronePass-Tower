var request = require('request');
var utils = require('./db/utils');
var proj4 = require('proj4');
proj4.defs("ESRI:102243","+proj=lcc +lat_1=37.06666666666667 +lat_2=38.43333333333333 +lat_0=36.5 +lon_0=-120.5 +x_0=2000000 +y_0=500000 +ellps=GRS80 +units=m +no_defs");

var port = process.env.PORT || 8080;
var io = require('socket.io')(port);

var CHECK_CONFLICT_INTERVAL = 12000;
var CHECK_IF_PATH_IS_UPDATED_INTERVAL = 30000;
var UPDATE_INTERVAL = 4000;


var dSay = function(msg) {
  console.log(msg);
  // push to some MQ or other storages for TTS
}

var tSay = function(msg) {
  console.log(msg);
  // push to some MQ or other storages for TTS
}

// Drones that we are currently connected with
var drones = {
  /*
  <callSign>: {
                <callSign>:,
                <location>:,
                <speed>:,
                <prevPathPtInd>:,
                <dist>:,
                <statusCode>:,
                <transcript>:
              },
              ...
  */
};
var pendingPathUpdates = {
  /*
  <callSign>: {
    <callSign>,
    <path>,
    <timeBufPrevPtInd>
  }
  */
};


io.on('connection', function(socket){

  // socket.emit('whoYouAre',{});

  // Simple test socket communication
  socket.on('tellMyName', function(msg){
    socket.emit('greetings', 'hello world ' + msg.name); // emit with a string!
  });


//*********************************************************
// Client Server Communication
//*********************************************************

  socket.on('CT_allDronesStates', function(msg){
    tSay('Sending drone list to Client Server');
    for(callSign in drones){
      // if (!drones[callSign].locationWGS84)
      drones[callSign].locationWGS84 = [];
      drones[callSign].locationWGS84 = proj4("ESRI:102243", "WGS84", drones[callSign].location);
      console.log(drones[callSign].locationWGS84);
    }
    socket.emit('TC_update', drones);
  });






//*********************************************************
// Drone Communication
//*********************************************************

  socket.on('DT_update', function(msg){
    dSay(msg.transcript);
    tSay("Tower received "+msg.callSign+"'s update.");
    drones[msg.callSign] = msg;
  });


  socket.on('DT_ack', function(msg){
    dSay(msg.transcript);
    tSay("Tower acknowledges "+msg.callSign+".");
  });


  socket.on('DT_register', function(msg){
    dSay(msg.transcript);
    tSay("Tower registering "+msg.callSign+".");
    // Put drone in local storage
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
        tSay("Tower received and rejects "+msg.callSign+"'s flight plan. Flight plan error.");
        socket.emit('TD_flightPlanDecision', {approved: false, error: err});
      }
      else if (pathConflicts.length === 0) {
        utils.addFlightPath(request).exec(function(err, pathInfo) {
          if (err) {
            tSay("Tower received and rejects "+msg.callSign+"'s flight plan. Flight plan error.");
            socket.emit('TD_flightPlanDecision', {approved: false, error: err});
          } else {
            tSay("Tower received and approves "+msg.callSign+"'s flight plan.");
            socket.emit('TD_flightPlanDecision', {approved: true});
          }
        });
      } else {
        tSay("Tower received and rejects "+msg.callSign+"'s flight plan. Flight plan restricted parcel conflicts.")
        socket.emit('TD_flightPlanDecision', {approved: false, pathConflicts: pathConflicts});
      }
    });

  });


  socket.on('DT_readyTakeOff', function(msg){
    dSay(msg.transcript);
    tSay("Acknowledged. "+callSign+", initiate take off.");
    drones[msg.callSign] = msg;

    // maybe add some checks/tests b4 take off
    socket.emit('TD_takeOff')
  });


  socket.on("DT_updateAck",function(msg){
    dSay(msg.transcript);
    tSay("Tower now updating flight path in database");

    // store route into the database
    var pathUpdate = pendingPathUpdates[msg.callSign];

    utils.getFlightData(msg.callSign)
    .then(function(pathData){
      var originalPath = JSON.parse(pathData[0].path_geom);
      var newPath = originalPath.coordinates.slice(0,pathUpdate.timeBufPrevPtInd).concat(pathUpdate.path);
      var newPathGeoJSON = JSON.stringify({"type":"LineString","coordinates":newPath});
      return utils.updateFlightPath(msg.callSign, newPathGeoJSON)
    })
    .then(function(result){
      console.log('updated database')
      console.log(result)
      delete pendingPathUpdates[msg.callSign];
    })
    .catch(function(error){
      console.log(error);
    });
  });






  // Tower requests all drones for an update every N milliseconds
  setInterval(function(){
    tSay("Tower requesting updates from all drones.");
    socket.emit('TD_update', {});
  }, UPDATE_INTERVAL);


  // Tower checks for path conflicts every N milliseconds
  setInterval(function(){
    for(var i in drones){
      utils.checkForPathConflicts(drones[i].callSign, drones[i].timeBufPrevPtInd)
      .then(function(fullReroutePackage){
        if (fullReroutePackage) {
          pendingPathUpdates[drones[i].callSign] = {
            "callSign": drones[i].callSign,
            "path": JSON.parse(fullReroutePackage.reroute.flightPath).coordinates,
            "timeBufPrevPtInd": drones[i].timeBufPrevPtInd
          }
          socket.emit("TD_changeRoute", pendingPathUpdates[drones[i].callSign]);
          socket.emit("TTC_update", fullReroutePackage);
        }
      });
    }
  }, CHECK_CONFLICT_INTERVAL);


  // Tower resubmits messages for drones to update paths
  setInterval(function(){
    for(var i in pendingPathUpdates){
      socket.emit("TD_changeRoute", pendingPathUpdates[i]);
    }
  }, CHECK_IF_PATH_IS_UPDATED_INTERVAL);


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

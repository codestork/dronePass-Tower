var request = require('request');
var utils = require('./db/utils');
// Library for converting WGS84 EPSG projections to California's ESRI: 102243 projection
var proj4 = require('proj4');
proj4.defs("ESRI:102243","+proj=lcc +lat_1=37.06666666666667 +lat_2=38.43333333333333 +lat_0=36.5 +lon_0=-120.5 +x_0=2000000 +y_0=500000 +ellps=GRS80 +units=m +no_defs");

var port = process.env.PORT || 8080;
var io = require('socket.io')(port);

//*********************************************************
// Global Variables
//*********************************************************
var CHECK_CONFLICT_INTERVAL = 12000;
var CHECK_IF_PATH_IS_UPDATED_INTERVAL = 30000;
var CHECK_IF_PATH_STEPS_RECEIVED = 1000;
var UPDATE_INTERVAL = 4000;

// Drones that are currently connected to the Tower Server
var drones = {
  /*
  <callSign>: {
                <callSign>,
                <location>,
                <speed>,
                <prevPathPtInd>,
                <dist>,
                <statusCode>,
                <transcript>
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
              },
              ...
  */
};

var pendingFullReroutePackageUpdate = null;
/*
<conflict>
<split>
<ring>
<reroute>
*/

var msgQueue = [];

var dSay = function(msg) {
  console.log(msg);
  msgQueue.push({
    sender:"Drone",
    msg: msg
  });
};

var tSay = function(msg) {
  console.log(msg);
  msgQueue.push({
    sender:"Tower",
    msg: msg
  });
};


io.on('connection', function(socket){

//*********************************************************
// Tower Client
//*********************************************************
  socket.on("TCT_getTranscripts", function(msg){
    socket.emit("TTC_updateTranscripts", [msgQueue[0]]);
    msgQueue.shift();
  });


//*********************************************************
// Landowner Server Communication
//*********************************************************

  socket.on('CT_allDronesStates', function(msg){
    // tSay('Tower sending drone list to Client Server');
    for(callSign in drones){
      drones[callSign].locationWGS84 = proj4("ESRI:102243", "WGS84", drones[callSign].location);
    }
    socket.emit('TC_update', drones);
  });


//*********************************************************
// Drone Communication
//*********************************************************

  socket.on('DT_ack', function(msg){
    dSay(msg.transcript);
    tSay("Tower acknowledges "+msg.callSign+".");
  });

  // Tower registers the drone to local server storage
  // and adds it to the database, then Tower requests
  // the drone to file in a flight plan
  socket.on('DT_register', function(msg){
    dSay(msg.transcript);
    tSay("Tower registering "+msg.callSign+".");
    // Put drone in local storage
    drones[msg.callSign] = msg;
    // Put drone in database
    utils.addDrone(msg.callSign, 1, 10)
    .then(function(result){
      socket.emit('TD_fileInFlightPlan');
    })
    .catch(function(error){
      console.error('Add Drone Error: ',error);
    });
  });

  socket.on('DT_update', function(msg){
    // dSay(msg.transcript);
    // tSay("Tower received "+msg.callSign+"'s update.");
    drones[msg.callSign] = msg;
  });

  // When a drone files in a flight plan, Tower checks
  // if there are any errors or parcel restriction conflicts
  // in the path. Tower then sends an approved boolean
  socket.on('DT_fileInFlightPlan', function(msg){
    dSay(msg.transcript);
    drones[msg.callSign] = msg;
    utils.getPathConflicts(msg).exec(function(err, pathConflicts) {
      if (err) {
        console.error('getPathConflicts error', err);
        tSay("Tower received and rejects "+msg.callSign+"'s flight plan. Flight plan error.");
        socket.emit('TD_flightPlanDecision', {approved: false, error: err});
      }
      else if (pathConflicts.length === 0) {
        utils.addFlightPath(msg).exec(function(err, pathInfo) {
          if (err) {
            console.error('addFlightPath error', err);
            tSay("Tower received and rejects "+msg.callSign+"'s flight plan. Flight plan error.");
            socket.emit('TD_flightPlanDecision', {approved: false, error: err});
          } else {
            tSay("Tower received and approves "+msg.callSign+"'s flight plan.");
            socket.emit('TD_flightPlanDecision', {approved: true});
          }
        });
      } else {
        console.log("pathConflicts list",pathConflicts);
        tSay("Tower received and rejects "+msg.callSign+"'s flight plan. Flight plan restricted parcel conflicts.");
        socket.emit('TD_flightPlanDecision', {approved: false, pathConflicts: pathConflicts});
      }
    });
  });

  socket.on('DT_readyTakeOff', function(msg){
    dSay(msg.transcript);
    tSay("Acknowledged. "+msg.callSign+", initiate take off.");
    drones[msg.callSign] = msg;
    socket.emit('TD_takeOff');
  });

  // After Tower receives confirmation of a path update
  // from a drone, Tower will update the drone's flight
  // path in the database to the new conflict free path
  socket.on("DT_updateAck",function(msg){
    dSay(msg.transcript);
    tSay("Tower now updating flight path in database");
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
      delete pendingPathUpdates[msg.callSign];
    })
    .catch(function(error){
      console.error('updateFlightPath error', error);
    });
  });

  // After Tower receives confirmation of path finder
  // steps receival from Tower Client, set pending
  // package to null
  socket.on("TCT_fullReroutePackageUpdateAck",function(msg){
    pendingFullReroutePackageUpdate = null;
  });

  // Requests update from drones every <UPDATE_INTERVAL> seconds
  setInterval(function(){
    // tSay("Tower requesting updates from all drones.");
    socket.emit('TD_update', {});
  }, UPDATE_INTERVAL);

  // Check if drones are approaching newly set parcel restrictions
  // every <CHECK_CONFLICT_INTERVAL> milliseconds. If a conflict is
  // detected, the tower will reroute the drone with the conflict.
  setInterval(function(){
    for(var i in drones){
      // status code 2 means the drone is on flight path
      if(drones[i].statusCode !== 2){
        continue;
      }
      utils.checkForPathConflicts(drones[i].callSign, drones[i].timeBufPrevPtInd)
      .then(function(fullReroutePackage){
        if (fullReroutePackage) {
          pendingPathUpdates[drones[i].callSign] = {
            "callSign": drones[i].callSign,
            "path": JSON.parse(fullReroutePackage.reroute.flightPath).coordinates,
            "timeBufPrevPtInd": drones[i].timeBufPrevPtInd
          }
          socket.emit("TD_changeRoute", pendingPathUpdates[drones[i].callSign]);
          pendingFullReroutePackageUpdate = fullReroutePackage;
          socket.emit("TTC_rerouteInfoUpdate", pendingFullReroutePackageUpdate);
        }
      });
    }
  }, CHECK_CONFLICT_INTERVAL);

  // Tells drones they need to update their paths
  // every <CHECK_IF_PATH_IS_UPDATED_INTERVAL>
  // until they are updated and removed from the
  // pendingPathUpdates object
  setInterval(function(){
    for(var i in pendingPathUpdates){
      socket.emit("TD_changeRoute", pendingPathUpdates[i]);
    }
  }, CHECK_IF_PATH_IS_UPDATED_INTERVAL);

  // Attempts to send package for path finding steps to
  // Tower Client every <CHECK_IF_PATH_STEPS_RECEIVED> ms
  setInterval(function(){
    if( pendingFullReroutePackageUpdate ) {
      socket.emit("TTC_rerouteInfoUpdate", pendingFullReroutePackageUpdate);
    }
  }, CHECK_IF_PATH_STEPS_RECEIVED)
});

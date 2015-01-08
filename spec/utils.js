var path = require('path');
var expect = require('chai').expect;
var pg = require(path.join(__dirname, '..', './server/db/config.js'));
var utils = require(path.join(__dirname, '..', './server/db/utils.js'));

var TIME_OUT = 1000;

describe('addFlightPath()', function () {
  'use strict';

  it('exists addFlightPath', function () {
    expect(utils.addFlightPath).to.be.a('function');
  });

  it('should fail to add a flight path with incorrect time order', function(done) {
    var linestring = {"type":"LineString","coordinates":[[-121.78344913643356,37.523210405243056],[-121.78061820472406,37.51003985009118],[-121.76222428103338,37.51429365145312],[-121.76742368405428,37.50678829541209]]};

    /** requires a drone to be in database
     requires a drone_operator to be in database
     requires 3 land owners to be in database
     landOwnerIds : 666, 667, 668
     parcel ids : 328449, 328451, 328452
     requires a restricted parcel 328449
     requires a restricted parcel with an exemption 328451
     requires a parcel that doesn't have restrictions 328452
    
     registerAddress(666, 328449, '04:05:06', '10:05:06');
     registerAddress(667, 328451, null, null);
     registerAddress(668, 328452, '04:05:06', '10:05:06');
    **/
    var drone_id = 666;
    var drone_operator_id = 666;
    var errResult;
    utils.addFlightPath(drone_id, drone_operator_id, "1999-01-08 05:05:06", "1999-01-08 04:05:06", "'" + JSON.stringify(linestring) + "'").exec(function(err, r) {
      errResult = err.routine;
    });

    setTimeout(function() {
      expect(errResult).to.equal('ExecConstraints');
      done();
    }, TIME_OUT);
  });

  it('should add flight path', function(done) {
    var result;
    var linestring = {"type":"LineString","coordinates":[[-121.78344913643356,37.523210405243056],[-121.78061820472406,37.51003985009118],[-121.76222428103338,37.51429365145312],[-121.76742368405428,37.50678829541209]]};
    /** requires a drone to be in database
     requires a drone_operator to be in database
     requires 3 land owners to be in database
     landOwnerIds : 666, 667, 668
     parcel ids : 328449, 328451, 328452
     requires a restricted parcel 328449
     requires a restricted parcel with an exemption 328451
     requires a parcel that doesn't have restrictions 328452
    
     registerAddress(666, 328449, '04:05:06', '10:05:06');
     registerAddress(667, 328451, null, null);
     registerAddress(668, 328452, '04:05:06', '10:05:06');
    **/

    
    var drone_id = 666;
    var drone_operator_id = 666;
    var flightPathId;
    utils.addFlightPath(drone_id, drone_operator_id, "1999-01-08 04:05:06", "1999-01-08 15:05:06", "'" + JSON.stringify(linestring) + "'").exec(function(err, r) {

      flightPathId = r.rows[0].gid;
      console.log(flightPathId);
      pg('flight_path')
        .where('gid',flightPathId)
        .delete().exec(function(err, r) {
      });
    });

    setTimeout(function() {
      expect(flightPathId).to.be.at.least(0);
    //   // try deeply?
    //   var resCoords = result.coordinates;
    //   var origCoords = linestring.coordinates;
    //   for (var i = 0; i < origCoords.length; i++) {
    //     for (var j = 0; j < origCoords[i].length; j++) {
    //       expect(resCoords[i][j]).to.be.closeTo(origCoords[i][j], 0.01);
    //     }
    //   }
      done();
    }, TIME_OUT);
  });
});

describe('getPathConflicts()', function() {
  it('exists getPathConflicts', function () {
    expect(utils.getPathConflicts).to.be.a('function');
  });

  it('should return restricted geometries from getPathConflicts', function (done) {
    var linestring = {"type":"LineString","coordinates":[[-121.78344913643356,37.523210405243056],[-121.78061820472406,37.51003985009118],[-121.76222428103338,37.51429365145312],[-121.76742368405428,37.50678829541209]]};

    var drone_id = 666;
    var drone_operator_id = 666;
    var result;
    utils.getPathConflicts(drone_id, drone_operator_id, "1999-01-08 04:05:06", "1999-01-08 10:05:06", "'" + JSON.stringify(linestring) + "'").exec(function(err, r) {
      
      result = r;
    });
    
    setTimeout(function() {
      console.log('argh');
      console.log(result);
      expect(1).to.equal(2);
      done();
    }, TIME_OUT);    
  });  
})

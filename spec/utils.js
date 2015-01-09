var path = require('path');
var expect = require('chai').expect;
var pg = require(path.join(__dirname, '..', './server/db/config.js'));
var utils = require(path.join(__dirname, '..', './server/db/utils.js'));

var TIME_OUT = 1000;

var pathCoords3 = [[1886555.8045440218,614332.6659284362],[1886800.1148899796,612866.8038526904],[1888455.9961236925,613328.2789506103],[1887953.8026347796,612513.9111307516]];
var callSign = 'Test';//INSERT INTO drone (call_sign, drone_type, max_velocity) VALUES ('Test', 'Amazon', 10);
var droneOperatorId = 12345;//INSERT INTO drone_operator (id, operator_name) VALUES (12345, 'Test');
    // INSERT INTO land_owner (id, login) VALUES (12345, 'yo@yo.yo');
    // INSERT INTO land_owner (id, login) VALUES (23456, 'bo@bo.bo');
    // INSERT INTO land_owner (id, login) VALUES (34567, 'mo@mo.mo');
var request = {
/**
request.callSign, callsign of the associated drone
          request.flightStart, the ISO string for the start date of the flight
          request.flightEnd, the ISO string for th end date for the flight
          request.path the nested tuple of coordinates
*/

  callSign : callSign,
  flightStart : "1999-01-08 05:05:06",
  flightEnd : "1999-01-08 04:05:06",
  // droneOperatorId : droneOperatorId,
  path : pathCoords3
};

describe('addFlightPath()', function () {
  'use strict';

  it('exists addFlightPath', function () {
    expect(utils.addFlightPath).to.be.a('function');
  });

  it('should fail to add a flight path with incorrect time order', function(done) {
    var callSign = 'Test';//INSERT INTO drone (call_sign, drone_type, max_velocity) VALUES ('Test', 'Amazon', 10);
    var droneOperatorId = 12345;//INSERT INTO drone_operator (id, operator_name) VALUES (12345, 'Test');

    var errResult;

    console.log(request);
    utils.addFlightPath(request).exec(function(err, r) {
      console.log(r);
      errResult = err.routine;
    });

    setTimeout(function() {
      expect(errResult).to.equal('ExecConstraints');
      done();
    }, TIME_OUT);
  });

  it('should add flight path', function(done) {    
    var flightPathId;

    request.flightStart = '1999-01-08 04:05:06';
    request.flightEnd = '1999-01-08 15:05:06';
    console.log(request);
    utils.addFlightPath(request).exec(function(err, r) {
      console.log(r);
      flightPathId = r.rows[0].gid;
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
    var expected = [ { lot_geom: 'MULTIPOLYGON(((-122.008923178452 37.5349152013217,-122.009064531035 37.5347408988317,-122.00937172567 37.5349041146075,-122.009367555469 37.53490922794,-122.009230364823 37.5350774921358,-122.008923178452 37.5349152013217)))' } ];

    request.flightStart = '1999-01-08 04:05:06';
    request.flightEnd = '1999-01-08 10:05:06';
    var result;
    console.log(request);
    utils.getPathConflicts(request).exec(function(err, r) {
      console.log(r);
      utils.getParcelGeometryText(r[0].gid, 'parcel_wgs84').exec(function(err, r) {

        result = r;
      });
    });
    
    setTimeout(function() {
      console.log(result);
      expect(result[0].lot_geom).to.equal(expected[0].lot_geom);
      done();
    }, TIME_OUT);    
  });

  xit('should not return geometries from getPathConflicts', function (done) {
    var linestring = {"type":"LineString","coordinates":[[-121.38344913643356,37.523210405243056],[-121.38061820472406,37.51003985009118],[-121.36222428103338,37.51429365145312],[-121.36742368405428,37.50678829541209]]};

    request.flightStart = '1999-01-08 04:05:06';
    request.flightEnd = '1999-01-08 10:05:06';
    var result;
    utils.getPathConflicts(request).exec(function(err, r) {
      console.log(r);
      result = r;
    });
    
    setTimeout(function() {
      expect(result.length).to.equal(0);
      done();
    }, TIME_OUT);    
  });

})

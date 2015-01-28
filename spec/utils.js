var path = require('path');
var expect = require('chai').expect;
var utils = require(path.join(__dirname, '..', './server/db/utils.js'));
var config = require('config');
var pg = require('knex')(config);
var st = require('knex-postgis')(pg);

var TIME_OUT = 500;

var pathCoords3 = [[1886555.8045440218,614332.6659284362],[1886800.1148899796,612866.8038526904],[1888455.9961236925,613328.2789506103],[1887953.8026347796,612513.9111307516]];
var callSign = 'Test';//INSERT INTO drone (call_sign, drone_type, max_velocity) VALUES ('Test', 'Amazon', 10);
var droneOperatorId = 12345;//INSERT INTO drone_operator (id, operator_name) VALUES (12345, 'Test');
    // INSERT INTO land_owner (id, login) VALUES (12345, 'yo@yo.yo');
    // INSERT INTO land_owner (id, login) VALUES (23456, 'bo@bo.bo');
    // INSERT INTO land_owner (id, login) VALUES (34567, 'mo@mo.mo');
    
    // INSERT INTO restriction_exemption (drone_call_sign, owned_parcel_gid, exemption_start, exemption_end) VALUES ('Test', 15, '1999-01-08 00:00:00', '1999-01-08 23:59:59');
//-121.793602174, 37.5605355809, apn : 96-100-23
var request = {
  callSign : callSign,
  flightStart : '1999-01-08 04:05:06',
  flightEnd : '1999-01-08 10:05:06',
  // droneOperatorId : droneOperatorId,
  path : pathCoords3
};


// temp. this should be replaced with scripts that run
var registerAddress = function(land_owner_id, parcel_gid, time_start, time_end) 
{
  pg.select(st.asText('lot_geom'))
  .from('parcel')
  .where('gid', parcel_gid)
  .then(function(result){
    pg.raw("SELECT ST_SetSRID(ST_ConvexHull(ST_GeomFromText('"+result[0].lot_geom+"')), 102243)")
    .then(function(r){
      return r.rows[0].st_setsrid;
    });
  })
  // All the data is ready. Now inserts row to owned_parcel
  .then(function(geom){
    return pg('owned_parcel').insert({
      land_owner_id: land_owner_id,
      parcel_gid: parcel_gid,
      hull_geom: geom,
      restriction_height: 0,
      restriction_start: time_start,
      restriction_end: time_end}, 
      ['gid', 'land_owner_id', 'parcel_gid', 'restriction_height', 'restriction_start', 'restriction_end'])
      .exec(function(err, rows){});
  });
};

var getAPNByGeography = function(longitude, latitude){
  return pg.select(['apn','gid'])
  .from('parcel')
  .whereRaw("ST_Contains(lot_geom, ST_Transform(ST_GeometryFromText('POINT("+longitude+" "+latitude+")',4326), 102243))");
};

describe('addFlightPath()', function () {
  'use strict';

  beforeEach(function(done) {
    // registerAddress(3, 70371, '04:05:06', '10:05:06');
    request.flightStart = '1999-01-08 04:05:06';
    request.flightEnd = '1999-01-08 10:05:06';
    done();
  });

  it('exists addFlightPath. Tests: [1, 2]', function () {
    expect(utils.addFlightPath).to.be.a('function');
  });

  it('should add flight path, Test1', function(done) {
    // test relies on there being the following data:
    // - drone with call_sign === 'Test1'
    // test relies on there being no flight_path with:
    // - the drone_call_sign === 'Test1'
    request.callSign = 'Test1';
    var flightPathId;
    utils.addFlightPath(request).exec(function(err, r) {
      flightPathId = r.rows[0].gid;
      pg('flight_path')
        .where('gid',flightPathId)
        .delete().exec(function(err, r) {
      });
    });

    setTimeout(function() {
      expect(flightPathId).to.be.at.least(0);
      done();
    }, TIME_OUT);
  });

  it('should fail to add a flight path with incorrect time order, Test2', function(done) {
    // test relies on there being the following data:
    // - drone with call_sign === 'Test2'
    // test relies on there being no flight_path with:
    // - the drone_call_sign === 'Test2'
    var errResult;

    request.callSign = 'Test2';
    request.flightStart = "1999-01-08 05:05:06";
    request.flightEnd = "1999-01-08 04:05:06";
    
    utils.addFlightPath(request).exec(function(err, r) {
      errResult = err.routine;
    });

    setTimeout(function() {
      expect(errResult).to.equal('ExecConstraints');
      done();
    }, TIME_OUT);
  });
});

describe('getPathConflicts()', function() {
  it('exists getPathConflicts', function () {
    expect(utils.getPathConflicts).to.be.a('function');
  });

  it('should return no restricted geometries because of exemption, Test3', function (done) {
    request.callSign = 'Test3';
    request.path = [[1876586.3304232405,615035.1327080689],[1876888.2187762756,614824.4040113207]];
    var result;
    var resultsLength;

    utils.getPathConflicts(request).exec(function(err, r) {
      console.log(r);
      if (err) {
        console.log(err);
        expect(err).to.equal('');
        done();
        return;
      }

      resultsLength = r.length;
    });

    setTimeout(function() {
      expect(resultsLength).to.equal(0);
      done();
    }, TIME_OUT);    
  });    

  it('should return restricted geometries from getPathConflicts Test4', function (done) {
    var expected = [ { lot_geom: 'MULTIPOLYGON(((-122.282200398657 37.8865961263712,-122.282306033954 37.8863047470094,-122.28237747253 37.886320833232,-122.282380798288 37.8863216370058,-122.282380378957 37.8863227998695,-122.282389003705 37.8863248945477,-122.282430572848 37.8863349877626,-122.28232956848 37.886623814168,-122.282200398657 37.8865961263712)))' } ];

    request.callSign = 'Test4';
    //-- flight path {"type":"LineString","coordinates":[[1877613.8620405402,614584.7430130504],[1877932.3029469794,614514.3159290175]]}
    request.path = [[1877613.8620405402,614584.7430130504],[1877932.3029469794,614514.3159290175]];
    var result;
    var resultsLength;

    utils.getPathConflicts(request).exec(function(err, r) {
      if (err) {
        console.log(err);
        expect(err).to.equal('');
        done();
        return;
      }

      resultsLength = r.length;
      console.log(r);
      if (resultsLength === 0) {
        expect(resultsLength).to.equal(1);
        done();
        return;
      }
      utils.getParcelGeometryText(r[0].gid, 'parcel_wgs84').exec(function(err, r) {
        result = r;
      });
    });    
    
    setTimeout(function() {
      expect(result[0].lot_geom).to.equal(expected[0].lot_geom);
      expect(resultsLength).to.equal(1);
      done();
    }, TIME_OUT);    
  });

  it('should not return geometries from getPathConflicts', function (done) {
    var pathCoordsWrong = [[-1886555.8045440218,564332.6659284362],[1886800.1148899796,562866.8038526904],[1888455.9961236925,563328.2789506103],[1887953.8026347796,562513.9111307516]];
    request.path = pathCoordsWrong;
    var result;
    utils.getPathConflicts(request).exec(function(err, r) {
      result = r.length;
    });
    
    setTimeout(function() {
      expect(result).to.equal(0);
      done();
    }, TIME_OUT);    
  });
})

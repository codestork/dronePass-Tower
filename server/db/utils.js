var pg = require('./config.js');
var st = require('knex-postgis')(pg);

var BUFFER_OFFSET = 5; // 5 METERS

/**
* All of the utility functions return a knex query
* 
* example w/ promise:
* getParcelGid(x,y,table).then(func).then(func);
*
* example w/ callback:
* getParcelGid(x,y,table).exec(callback);
*/





//*************************************************************************
//        GENERAL QUERIES
//*************************************************************************

/**
* input: gid, table
* output: knex query that selects GeoJSON Geometry of provided gid in provided table
*/
var getParcelGeometryJSON = function(gid, table){
  var query = pg.select(st.asGeoJSON('lot_geom'))
  .from(table || 'parcel')
  return gid.constructor === Array ? query.whereIn('gid', gid) : query.where('gid', gid);
}


/**
* input: gid (integer or array of integers), table
* output: knex query that selects Text Geometry of provided gid in provided table
*/
var getParcelGeometryText = function(gid, table){
  var query = pg.select(st.asText('lot_geom'))
  .from(table || 'parcel')
  return gid.constructor === Array ? query.whereIn('gid', gid) : query.where('gid', gid);
}


/**
* input: Geometry as Text
* output: knex query that gives Convex Hull as Raw Geometry
*/
var convertToConvexHull = function(geoText){
  return pg.raw("SELECT ST_SetSRID(ST_ConvexHull(ST_GeomFromText('"+geoText+"')), 102243)")
  .then(function(r){
    return r.rows[0].st_setsrid;
  });
}


/**
* input: long, lat
* output: knex query that selects gid of Parcel that intersects with provided long lat point
*         by geography calculations (slow, exact)
*/
var getParcelGidByGeography = function(longitude, latitude){
  var longitude=-122.023036, latitude=37.634351;
  return pg.select('gid')
  .from('parcel_wgs84')
  .whereRaw("ST_Intersects(ST_GeographyFromText('SRID=4326;POINT("+longitude+" "+latitude+")'), lot_geom)");
}
// var d1 = new Date;
// getParcelGidByGeography(-122.023036, 37.634351).then(function(r){
//   d1d = new Date;
//   console.log(r);
//   console.log('geog',(d1d-d1)+'ms');
// });


/**
* input: long, lat
* output: knex query that selects gid of Parcel that intersects with provided long lat point
*         by geometry calculations (fast, estimate)
*/
var getParcelGid = function(longitude, latitude){
  return pg.select('gid')
  .from('parcel')
  .whereRaw("ST_Contains(lot_geom, ST_Transform(ST_GeometryFromText('POINT("+longitude+" "+latitude+")',4326), 102243))");
}
// var d2 = new Date;
// getParcelGid(-122.023036, 37.634351)
// .then(function(r){
//   d2d = new Date;
//   console.log(r);
//   console.log('geom',(d2d-d2)+'ms');
//   return r;
// })
// .then(function(r){
//   return getParcelGeometry(r[0].gid)
//   .then(function(geom){
//     return {gid:r[0].gid, geom: geom[0].lot_geom}
//   });
// })
// .then(console.log);


/**
* input:  request.callSign, callsign of the associated drone
          request.flightStart, the ISO string for the start date of the flight
          request.flightEnd, the ISO string for th end date for the flight
          request.path the nested tuple of coordinates
* output: knex query that returns all the parcel geometries that intersect
*/
var getPathConflicts = function(request) {
  var linestring = {'type':'LineString', 'coordinates':request.path};
  var linestringValue = "ST_SetSRID(ST_GeomFromGeoJSON('" + JSON.stringify(linestring) + "'),102243)";

  var intersectLine = 'ST_Intersects(' + linestringValue + ',' + 'hull_geom' + ')';
  var restrictionOverlap = "('" + request.flightStart + "'::time, '" + request.flightEnd + "'::time) OVERLAPS (restriction_start::time, restriction_end::time)";
  var rawQuery = intersectLine + ' AND ' + restrictionOverlap + ';';

  // where not in (
  //    select owned_parcel_gid 
  //    from restriction_exemption 
  //    where call_sign=request.callSign 
  //    AND flightStart > exemptionStart 
  //    AND flightEnd < exemptionEnd
  //)
  //
  // doesn't check exemption tables yet
  return pg.select('owned_parcel_gid').from('restriction_exemption')
  .where('drone_call_sign', request.callSign)
  .andWhere('exemption_start', '<', request.flightStart)
  .andWhere('exemption_end', '>', request.flightEnd)
  .map(function(row) {
    return row.owned_parcel_gid;
  })
  .then(function(owned_parcel_gids) {
    return pg.select('gid').from('owned_parcel')
           .whereNotIn('gid', owned_parcel_gids)
           .whereRaw(rawQuery);
  })
  .catch(function(error) {
    console.log(error);
    return error;
  });
}

/**
* input:  request.callSign, callsign of the associated drone
          request.flightStart, the ISO string for the start date of the flight
          request.flightEnd, the ISO string for th end date for the flight
          request.path the nested tuple of coordinates
* output: knex query that adds a flight path or returns the geometries that do not allow the flight path to be added
*/
var addFlightPath = function(request){
  var linestring = {'type':'LineString', 'coordinates':request.path};
  var linestringValue = "ST_SetSRID(ST_GeomFromGeoJSON('" + JSON.stringify(linestring) + "'),102243)";
  var columns = '(drone_call_sign,flight_start,flight_end,path_geom)';
  var values =  "('" + request.callSign + "','" + request.flightStart + "','" + request.flightEnd + "'," + linestringValue +')';
  var rawInsert = 'INSERT INTO flight_path ' + columns + ' VALUES ' + values + ' RETURNING gid;';
  // and insert buffered flight path

  return pg.raw(rawInsert);      
}






module.exports = {
  // General
  getParcelGeometryJSON:      getParcelGeometryJSON,
  getParcelGeometryText:      getParcelGeometryText,
  getParcelGidByGeography:    getParcelGidByGeography, 
  convertToConvexHull:        convertToConvexHull,
  getParcelGid:               getParcelGid,
  addFlightPath:              addFlightPath,
  getPathConflicts:           getPathConflicts
}

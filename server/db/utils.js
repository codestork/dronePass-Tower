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
  return pg.select(st.asGeoJSON('lot_geom'))
  .from(table || 'parcel')
  .where('gid',gid);
}



/**
* input: gid, table
* output: knex query that selects Text Geometry of provided gid in provided table
*/
var getParcelGeometryText = function(gid, table){
  return pg.select(st.asText('lot_geom'))
  .from(table || 'parcel')
  .where('gid',gid);
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
* input:  drone_id,  the id of the associated drone
          drone_operator_id, the id of the associated operator
          flight_start, the ISO string for the start date of the flight
          flight_end, the ISO string for th end date for the flight
          linestring_wgs84 the GeoJSON string for the proposed geometry.
* output: knex query that returns all the parcel geometries that intersect
*/
var getPathConflicts = function(drone_id, drone_operator_id, flight_start, flight_end, linestring_wgs84) {
  var linestringValue = 'ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(' + linestring_wgs84 + '),4326),102243)';
  var intersectLine = 'ST_Intersects(' + linestringValue + ',' + 'hull_geom' + ')';
  var restrictionOverlap = "('" + flight_start + "'::time, '" + flight_end + "'::time) OVERLAPS (restriction_start::time, restriction_end::time)";
  var rawQuery = intersectLine + ' AND ' + restrictionOverlap + ';';

  // doesn't check exemption tables yet

  // should return the geometries from the wgs84_parcel 
  console.log(rawQuery);
  return pg.select('gid')
    .from('owned_parcel')
    .whereRaw(rawQuery);
}

/**
* input:  drone_id,  the id of the associated drone
          drone_operator_id, the id of the associated operator
          flight_start, the ISO string for the start date of the flight
          flight_end, the ISO string for th end date for the flight
          linestring_wgs84 the GeoJSON string for the proposed geometry.
* output: knex query that adds a flight path or returns the geometries that do not allow the flight path to be added
*/
var addFlightPath = function(drone_id, drone_operator_id, flight_start, flight_end, linestring_wgs84) {
  // if there are no restrictions insert into flight path
  var linestringValue = 'ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(' + linestring_wgs84 + '),4326),102243)';
  var insertLine = 'INSERT INTO flight_path (drone_id, drone_operator_id, flight_start, flight_end, path_geom)';
  var valuesLine = 'VALUES (' + drone_id + ',' + drone_operator_id + ",'" + flight_start + "','" + flight_end + "'," + linestringValue +')';
  var rawInsert = insertLine + ' ' + valuesLine + ' ' + 'RETURNING gid;';

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

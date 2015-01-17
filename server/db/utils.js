var pg = require('./config.js');
//var pg = require('./testConfig.js');
var st = require('knex-postgis')(pg);

var BUFFER_OFFSET = 5; // IN METERS

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
* input:  gid     (INTEGER)
          table   (STRING)
* output: knex query that selects GeoJSON Geometry of provided gid in provided table
*/
var getParcelGeometryJSON = function(gid, table){
  var query = pg.select(st.asGeoJSON('lot_geom'))
  .from(table || 'parcel')
  return gid.constructor === Array ? query.whereIn('gid', gid) : query.where('gid', gid);
};

/**
* input:  gid     (INTEGER or Array of INTEGERS)
          table   (STRING)
* output: knex query that selects Text Geometry of provided gid in provided table
*/
var getParcelGeometryText = function(gid, table){
  var query = pg.select(st.asText('lot_geom'))
  .from(table || 'parcel')
  return gid.constructor === Array ? query.whereIn('gid', gid) : query.where('gid', gid);
};

/**
* input:  Geometry (as Text)
* output: knex query that gives Convex Hull as Raw Geometry
*/
var convertToConvexHull = function(geoText){
  return pg.raw("SELECT ST_SetSRID(ST_ConvexHull(ST_GeomFromText('"+geoText+"')), 102243)")
  .then(function(r){
    return r.rows[0].st_setsrid;
  });
};

/**
* input:  longitude   (FLOAT) (NOTE: expects WGS84 coordinates)
          latitude    (FLOAT)
* output: knex query that selects gid of Parcel that intersects with provided long lat point
*         by geography calculations (slow, exact)
*/
var getParcelGidByGeography = function(longitude, latitude){
  return pg.select('gid')
  .from('parcel_wgs84')
  .whereRaw("ST_Intersects(ST_GeographyFromText('SRID=4326;POINT("+longitude+" "+latitude+")'), lot_geom)");
};

/**
* input:  longitude   (FLOAT) (NOTE: expects WGS84 coordinates)
          latitude    (FLOAT)
* output: knex query that selects gid of Parcel that intersects with provided long lat point
*         by geometry calculations (fast, estimate)
*/
var getParcelGid = function(longitude, latitude){
  return pg.select('gid')
  .from('parcel')
  .whereRaw("ST_Contains(lot_geom, ST_Transform(ST_GeometryFromText('POINT("+longitude+" "+latitude+")',4326), 102243))");
};

/**
* input:  gids        (Array of INTEGERS)
          tableName   (STRING) OPTIONAL
          geomColName (STRING) OPTIONAL
* output: knex query that gives an array of geometries (As Text) matching given gids
*/
var getGeometriesFromGids = function(gids, tableName, geomColName){
  return pg.select(geomColName || 'hull_geom')
  .from(tableName || 'owned_parcel')
  .whereIn('gid', gids)
  .map(function(geom){
    return geomColName ? geom[geomColName] : geom['hull_geom'];
  })
  .map(function(geom){
    return pg.raw("SELECT ST_AsText('"+geom+"')")
    .then(function(sridSetGeom){
      return sridSetGeom.rows[0].st_astext;
    });
  });
};

/**
* input:  polygon (as text or geometry)
* output: promise with exterior ring of polygon (as text)
*/
var getExternalRing = function(polygon){
  return pg.raw("SELECT ST_asText(ST_ExteriorRing('"+polygon+"'))")
  .then(function(exteriorRing){
    return exteriorRing.rows[0].st_astext;
  });
};

/**
* input:  two geometries (as text or geometry)
* output: promise with what geom1 does not share
*         with geom2 (as text)
*/
var getDifference = function(geom1, geom2){
  return pg.raw("SELECT ST_AsGeoJSON(ST_Difference('"+geom1+"','"+geom2+"'))")
  .then(function(diff){
    return diff.rows[0].st_asgeojson;
  });
};

/**
* input:  geoJSON (as GeoJSON)
* output: promise with geometry (as text)
*/
var getTextFromGeoJSON = function(geoJSON){
  return pg.raw("SELECT ST_AsTexT(ST_SetSRID(ST_GeomFromGeoJSON('"+geoJSON+"'), 102243))")
  .then(function(text){
    return text.rows[0].st_astext;
  });
};

/**
* input:  open line string (as GeoJSON)
* output: promise with a closed line string (as GeoJSON)
*/
var getClosedLineString = function(openRing){
  var ring = JSON.parse(openRing).coordinates[0];
  ring.push(ring[0]);
  var ringJSONObj = {"type": "LineString", "coordinates": ring};
  return JSON.stringify(ringJSONObj);
};

/**
* input:  array of line strings (as GeoJSON)
* output: promise with a multi line string (as GeoJSON)
*/
var makeMultiLineString = function(lineStrings){
  var multiLineString = {"type":"MultiLineString", "coordinates": []};
  for(var i=0; i<lineStrings.length; i++){
    multiLineString.coordinates.push(JSON.parse(lineStrings[i]).coordinates);
  }
  return JSON.stringify(multiLineString);
};

/**
* input:  Polygon     (as text or geometry)
*         LineString  (as text or geometry)
* output: promise with tuple of two polygons (as GeoJSON)
*/
var getSplitPolygon = function(polygon, lineString){
  return pg.raw("SELECT ST_AsGeoJSON(ST_Split('"+polygon+"','"+lineString+"'))")
  .then(function(result){
    var geoms = JSON.parse(result.rows[0].st_asgeojson).geometries;
    var splitPolygons = [];
    for(var i=0; i<geoms.length; i++){
      splitPolygons.push(JSON.stringify(geoms[i]));
    }
    return splitPolygons;
  });
};

/**
* input:  tuple of LineStrings (as text or geometry)
* output: promise with shorter LineString (as text or geometry)
*/
var getShorterOfTwoLineString = function(lines){
  var line1 = lines[0], line2 = lines[1];
  return pg.raw("SELECT ST_Length('"+line1+"')")
  .then(function(length1){
    length1 = length1.rows[0].st_length;
    return pg.raw("SELECT ST_Length('"+line2+"')")
    .then(function(length2){
      length2 = length2.rows[0].st_length;
      return length1 > length2 ? line2 : line1;
    });
  });
};

/**
* input:  two geometries (as text or geometry)
* output: promise with the merged xor of two geometries (as text)
*/
var getSymDifference = function(geom1, geom2){
  return pg.raw("SELECT ST_AsText(ST_LineMerge(ST_SymDifference('"+geom1+"','"+geom2+"')))")
  .then(function(newLineString){
    return newLineString.rows[0].st_astext;
  });
};

/**
* input:  MultiLineString (as text or geometry)
* output: if mergable -> promise with merged LineString (as text)
          if not mergable -> promise with given MultiLineString (as text)
*/
var getLineMerge = function(multiLineString){
  return pg.raw("SELECT ST_AsText(ST_LineMerge('"+multiLineString+"'))")
  .then(function(result){
    return result.rows[0].st_astext;
  });
};

/**
* input:  two geometries (as text or geometry)
* output: promise with the intersection of two geometries (as text)
*/
var getIntersection = function(geom1, geom2){
  return pg.raw("SELECT ST_AsText(ST_Intersection('"+geom1+"','"+geom2+"'))")
  .then(function(result){
    return result.rows[0].st_astext;
  })
};

/**
* input:  array of geometries (as text)
* output: promise with the union of all the geometries
*         (as either a Geometry Collection, MultiPolygon
*         or MultiLineString)
*/
var makeMultiGeometry = function(geoms){
  var arr = [];
  for (var i=0; i<geoms.length; i++){
    arr[i] = " ST_GeomFromText('"+geoms[i]+"')";
  }
  return pg.raw("SELECT ST_AsText(ST_Union(ARRAY["+arr+"]))")
  .then(function(result){
    return result.rows[0].st_astext;
  })
};

/**
* input:  geometry or text geometry
* output: GeoJSON formatted geometry
*/
var getGeoJSONFromGeom = function(geom){
  return pg.raw("SELECT ST_AsGeoJSON('"+geom+"')")
  .then(function(result){
    return result.rows[0].st_asgeojson;
  })
};

/**
* input:  polygon       (as Text or Geometry)
*         buffer length (FLOAT)
* output: promise with a buffered polygon (as Text)
*/
var bufferPolygon = function(polygon, bufferSize){
  return pg.raw("SELECT ST_AsText(ST_Buffer('"+polygon+"',"+bufferSize+", 'join=mitre mitre_limit=5.0'))")
  .then(function(result){
    return result.rows[0].st_astext;
  });
};


//*************************************************************************
//          Drone Queries
//*************************************************************************

/**
* input:  call sign     (STRING)
*         drone type    (STRING)
*         max velocity  (INTEGER)
* output: knex query that inserts a row to drone table
*/
var addDrone = function(callSign, droneType, maxVelocity) {
  return pg('drone')
  .select('call_sign', 'drone_type', 'max_velocity')
  .where('call_sign', callSign)
  .then(function(r){
    if (r.length === 0) {
      return pg('drone')
      .insert({
        call_sign: callSign,
        drone_type: droneType,
        max_velocity: maxVelocity
      }, ['call_sign', 'drone_type', 'max_velocity']);
    } else {
      return r[0];
    }
  });
};

/**
* input:  callSign (STRING)
* output: knex query that removes a row in the drone table with matching call sign
*/
var removeDrone = function(callSign) {
  return pg('drone')
  .where('call_sign',callSign)
  .delete();
};

/**
* input:  callSign (STRING)
* output: promise with operator id, flight start time, flight end time, and path_geom
*/
var getFlightData = function(callSign){
  return pg.select(pg.raw("drone_operator_id, flight_start::time, flight_end::time, ST_AsGeoJSON(path_geom)"))
  .from('flight_path')
  .where('drone_call_sign', callSign)
  .map(function(result){
    result.path_geom = result.st_asgeojson;
    delete result.st_asgeojson;
    return result;
  });
};

/**
* input:  callSign (STRING)
* output: deletes row with matching call sign and returns a promise
*/
var removeFlightPath = function(callSign){
  return pg('flight_path')
  .where('drone_call_sign', callSign)
  .delete();
};

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

  return pg.select('owned_parcel_gid').from('restriction_exemption')
  .where('drone_call_sign', request.callSign)
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
};

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

  return pg.select("drone_call_sign")
  .from("flight_path")
  .where("drone_call_sign", request.callSign)
  .then(function(results){
    if (results.length === 0) {
      return pg.raw(rawInsert);
    } else {
      return removeFlightPath(request.callSign)
      .then(function(){
        return pg.raw(rawInsert);
      })
    }
  });
};

/**
stages = {
  <conflict>,
  <split>,
  <ring>,
  <reroute>
}
*/
var alternativePathPieces = function(linestring, geometries){
  var cutLine;
  var lineToCutOut;
  var stages = {};

  var arr = [];
  for (var i=0; i<geometries.length; i++) {
    arr.push(geometries[i].gid);
  }

  return pg.select('parcel_gid')
  .from('owned_parcel')
  .whereIn('gid', arr)
  .map(function(result){
    return result.parcel_gid;
  })
  .then(function(parcelGids){
    return getGeometriesFromGids(parcelGids, "parcel", "lot_geom")
    .then(makeMultiGeometry)
    .then(function(multiPolygon){
      stages['reroute'] = { parcel: multiPolygon };
      return arr;
    });
  })
  // make union of all geoms
  // Break apart lineString (as cutLine) 
  // to no longer intersect with geometries
  // Save removed segments (as lineToCutOut)
  .then(function(){
    return getGeometriesFromGids(arr);
  })
  .map(function(polygon){
    return bufferPolygon(polygon, 1);
  })
  .then(function(polygons){
    return makeMultiGeometry(polygons)
    .then(function(multiPolygon){
      /**
      conflict: {
        parcel: multiPolygon,
        flightPath: linestring
      }
      **/
      stages['conflict'] = { 
        parcel: multiPolygon,
        flightPath: linestring
      };
      return getDifference(linestring, multiPolygon)
      .then(getTextFromGeoJSON)
      .then(function(result){
        cutLine = result;
        /**
        split: {
          parcel: multiPolygon,
          flightPath: cutLine
        }
        **/
        stages['split'] = { 
          flightPath: cutLine,
          parcel: []
        };
      })
      .then(function(){
        return getIntersection(linestring, multiPolygon)
      })
      .then(function(result){
        lineToCutOut = result;
        return polygons;
      })
    });
  })
  // Split given polygons by lineString
  // to get a ringLineString(multilinestring) of the smaller
  // line segments made by the polygon splits
  .map(function(polygons){
    return getSplitPolygon(polygons, linestring)
    .map(getTextFromGeoJSON)
    .then(function(splitPolygons) {
      stages['split']['parcel'].push(splitPolygons);
      return splitPolygons;
    })
    .map(getExternalRing)
    .then(function(result){
      return getShorterOfTwoLineString(result);
    })
  })
  .then(makeMultiGeometry)
  .then(function(ringLineString){
    /**
    ring: {
      parcel: MultiLineString,
      flightPath: MultiLineString
    }
    **/
    stages['ring'] = { 
      parcel: ringLineString,
      flightPath: cutLine
    };
    return getDifference(ringLineString, lineToCutOut)
    .then(getTextFromGeoJSON)
  })
  // Might be optional. Merges some line segments
  .then(function(lineToMerge){
    return getLineMerge(lineToMerge)
  })
  // Merges the paths around parcel with the cut
  // up original lineString
  .then(function(line){
    return getSymDifference(cutLine, line)
    .then(function(result) {
      stages['reroute'].flightPath = result;
      // stages['reroute'] = {
      //   flightPath: result
      // };
      return stages;
    });
  })
  // Formatting to GeoJSON Section
  .then(function(){
    // CONFLICT
    return getGeoJSONFromGeom(stages.conflict.parcel)
    .then(function(geoJSON){
      stages.conflict.parcel = geoJSON;
    })
    .then(function(){
      return getGeoJSONFromGeom(stages.conflict.flightPath)
      .then(function(geoJSON){
        stages.conflict.flightPath = geoJSON;
      })
    })
    // SPLIT
    .then(function(){
      return getGeoJSONFromGeom(stages.split.flightPath)
      .then(function(geoJSON){
        stages.split.flightPath = geoJSON;
        return stages.split.parcel;
      })
    })
    .map(function(parcel){
      var pairOne, pairTwo;
      return getGeoJSONFromGeom(parcel[0])
      .then(function(geoJSON){
        pairOne = geoJSON;
      })
      .then(function(){return getGeoJSONFromGeom(parcel[1])})
      .then(function(geoJSON){
        pairTwo = geoJSON;
        return [pairOne,pairTwo];
      });
    })
    .then(function(parcel){
      stages.split.parcel = parcel;
      return stages;
    })
    // RING
    .then(function(){
      return getGeoJSONFromGeom(stages.ring.parcel)
      .then(function(geoJSON){
        stages.ring.parcel = geoJSON;
      });
    })
    .then(function(){
      return getGeoJSONFromGeom(stages.ring.flightPath)
      .then(function(geoJSON){
        stages.ring.flightPath = geoJSON;
      });
    })
    // REROUTE
    .then(function(){
      return getGeoJSONFromGeom(stages.reroute.parcel)
      .then(function(geoJSON){
        stages.reroute.parcel = geoJSON;
      });
    })
    .then(function(){
      return getGeoJSONFromGeom(stages.reroute.flightPath)
      .then(function(geoJSON){
        stages.reroute.flightPath = geoJSON;
        return stages;
      });
    });
  });
};

/*
* input:  callSign  (STRING)
          path      (GeoJSON)
* output: updates flight_path table with a new path for given call sign
*/
var updateFlightPath = function(callSign, path){
  return pg.raw("UPDATE flight_path SET path_geom = ST_SetSRID(ST_GeomFromGeoJSON('"+path+"'),102243) WHERE drone_call_sign='"+callSign+"'")
};

/**
* input:    pathGeometry      (LineString)
            parcelGeometries  (Array of gids)
* output:   LineString of new path that goes around
*           given geometry conflicts 
*/
var makeAlternativePath = function(lineString, geometries){
  var cutLine;
  var lineToCutOut;
  var arr = [];
  for (var i=0; i<geometries.length; i++) {
    arr.push(geometries[i].gid);
  }
  // make union of all geoms
  // Break apart lineString (as cutLine) 
  // to no longer intersect with geometries
  // Save removed segments (as lineToCutOut)
  return getGeometriesFromGids(arr)
  .map(function(polygon){
    return bufferPolygon(polygon, 1);
  })
  .then(function(polygons){
    return makeMultiGeometry(polygons)
    .then(function(multiPolygon){
      return getDifference(lineString, multiPolygon)
      .then(getTextFromGeoJSON)
      .then(function(result){
        cutLine = result;
      })
      .then(function(){
        return getIntersection(lineString, multiPolygon)
      })
      .then(function(result){
        lineToCutOut = result;
        return polygons;
      })
    });
  })
  // Split given polygons by lineString
  // to get a ringLineString(multilinestring) of the smaller
  // line segments made by the polygon splits
  .map(function(polygons){
    return getSplitPolygon(polygons, lineString)
    .map(getTextFromGeoJSON)
    .map(getExternalRing)
    .then(function(result){
      return getShorterOfTwoLineString(result);
    })
  })
  .then(makeMultiGeometry)
  .then(function(ringLineString){
    return getDifference(ringLineString, lineToCutOut)
    .then(getTextFromGeoJSON)
  })
  // Might be optional. Merges some line segments
  .then(function(lineToMerge){
    return getLineMerge(lineToMerge)
  })
  // Merges the paths around parcels with the cut
  // up original lineString
  .then(function(line){
    return getSymDifference(cutLine, line);
  });
};

/**
* input:  callSign         (STRING)
          timeBufPrevPtInd (INTEGER)
* output: promise with a new LineString if there is a conflict and null if no conflict
*/
var checkForPathConflicts = function(callSign, timeBufPrevPtInd){
  var droneCheck = {};
  droneCheck.callSign = callSign;
  return getFlightData(callSign)
  .then(function(flightData){
    var timestampPrefix = "2000-11-11 "; // hackish fix to timestamp/zone issues
    droneCheck.flightStart = timestampPrefix + flightData[0].flight_start;
    droneCheck.flightEnd = timestampPrefix + flightData[0].flight_end;
    droneCheck.pathAsGeoJSON = flightData[0].path_geom;
    var path = JSON.parse(flightData[0].path_geom).coordinates;
    path = path.slice(timeBufPrevPtInd);

    droneCheck.path = path;
    return droneCheck;
  })
  .then(getPathConflicts)
  .then(function(gids){
    // There is at least one Conflicting Hull Geometry
    if (gids.length > 0) {
      return getTextFromGeoJSON(droneCheck.pathAsGeoJSON)
      .then(function(lineString){
        return alternativePathPieces(lineString, gids);
      });
    // No Conflicting Hull Geometries
    } else {
      return null;
    }
  })
  .catch(function(error){
    console.log(error);
    return error;
  });
};


module.exports = {
  // General
  getParcelGeometryJSON:      getParcelGeometryJSON,
  getParcelGeometryText:      getParcelGeometryText,
  getParcelGidByGeography:    getParcelGidByGeography,
  convertToConvexHull:        convertToConvexHull,
  getGeoJSONFromGeom:         getGeoJSONFromGeom,
  getTextFromGeoJSON:         getTextFromGeoJSON,
  getParcelGid:               getParcelGid,
  // Drone
  addDrone:                   addDrone,
  removeDrone:                removeDrone,
  getFlightData:              getFlightData,
  addFlightPath:              addFlightPath,
  updateFlightPath:           updateFlightPath,
  getPathConflicts:           getPathConflicts,
  makeAlternativePath:        makeAlternativePath,
  checkForPathConflicts:      checkForPathConflicts
}

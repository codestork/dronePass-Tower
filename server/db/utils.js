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
* input:  gid, table
* output: knex query that selects GeoJSON Geometry of provided gid in provided table
*/
var getParcelGeometryJSON = function(gid, table){
  var query = pg.select(st.asGeoJSON('lot_geom'))
  .from(table || 'parcel')
  return gid.constructor === Array ? query.whereIn('gid', gid) : query.where('gid', gid);
};


/**
* input:  gid (integer or array of integers), table
* output: knex query that selects Text Geometry of provided gid in provided table
*/
var getParcelGeometryText = function(gid, table){
  var query = pg.select(st.asText('lot_geom'))
  .from(table || 'parcel')
  return gid.constructor === Array ? query.whereIn('gid', gid) : query.where('gid', gid);
};


/**
* input:  Geometry as Text
* output: knex query that gives Convex Hull as Raw Geometry
*/
var convertToConvexHull = function(geoText){
  return pg.raw("SELECT ST_SetSRID(ST_ConvexHull(ST_GeomFromText('"+geoText+"')), 102243)")
  .then(function(r){
    return r.rows[0].st_setsrid;
  });
};


/**
* input:  long, lat
* output: knex query that selects gid of Parcel that intersects with provided long lat point
*         by geography calculations (slow, exact)
*/
var getParcelGidByGeography = function(longitude, latitude){
  var longitude=-122.023036, latitude=37.634351;
  return pg.select('gid')
  .from('parcel_wgs84')
  .whereRaw("ST_Intersects(ST_GeographyFromText('SRID=4326;POINT("+longitude+" "+latitude+")'), lot_geom)");
};


/**
* input:  long, lat
* output: knex query that selects gid of Parcel that intersects with provided long lat point
*         by geometry calculations (fast, estimate)
*/
var getParcelGid = function(longitude, latitude){
  return pg.select('gid')
  .from('parcel')
  .whereRaw("ST_Contains(lot_geom, ST_Transform(ST_GeometryFromText('POINT("+longitude+" "+latitude+")',4326), 102243))");
};


/**
* input:  [{gid: #},{gid: #},{gid: #}...]
* output: promise with an array of geometries
*/
var getGeometriesFromGids = function(gids, tableName, geomColName){
  var arr = [];
  for (var i=0; i<gids.length; i++) {
    arr.push(gids[i].gid);
  }
  return pg.select(geomColName || 'hull_geom')
  .from(tableName || 'owned_parcel')
  .whereIn('gid', arr)
  .then(function(x){
    return x;
  })
  .map(function(geom){
    return geomColName ? geom[geomColName] : geom['hull_geom'];
  })
  .map(function(geom){
    return pg.raw("SELECT ST_AsText(ST_SetSRID(ST_AsText('"+geom+"'), 102243))")
    .then(function(sridSetGeom){
      return sridSetGeom.rows[0].st_astext;
    });
  })
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
  // return pg.raw("SELECT ST_Difference('"+geom1+"',ST_GeometryFromText('"+geom2+"'))")
  return pg.raw("SELECT ST_AsGeoJSON(ST_Difference('"+geom1+"','"+geom2+"'))")
  .then(function(diff){
    // return diff.rows[0].st_difference;
    return diff.rows[0].st_asgeojson;
  });
};

/**
* input:  geoJSON
* output: promise with geometry (as text)
*/
var getTextFromGeoJSON = function(geoJSON){
  return pg.raw("SELECT ST_AsTexT(ST_SetSRID(ST_GeomFromGeoJSON('"+geoJSON+"'), 102243))")
  .then(function(text){
    return text.rows[0].st_astext;
  });
}

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
}


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
  })
}


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
    })
  })
}


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
* output: Geo JSON
*/
var getGeoJSONFromGeom = function(geom){
  return pg.raw("SELECT ST_AsGeoJSON('"+geom+"')")
  .then(function(result){
    return result.rows[0].st_asgeojson;
  })
}


























//*************************************************************************
//          Drone Queries
//*************************************************************************


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


/**
* input:    pathGeometry      (LineString)
            parcelGeometries  (Array of gids)
* output:   LineString of new path that goes around
*           given geometry conflicts 
*/
var makeAlternativePath = function(lineString, geometries){
  var cutLine;
  var lineToCutOut;
  // Break apart lineString (as cutLine) 
  // to no longer intersect with geometries
  // Save removed segments (as lineToCutOut)
  return getGeometriesFromGids(geometries)
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
  // to get a MultiLineString of the smaller
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
  .then(function(multiLineString){
    return getDifference(multiLineString, lineToCutOut)
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





// Example makeAlternaivePath (assuming gid:3 and gid:5 exist & are referencing the same
// parcels that I used for testing)

// var qgisLineString = 'LINESTRING(1844948.3 649934.9, 1847550.9 645370.2)';
// makeAlternativePath(qgisLineString, [{gid: 3}, {gid: 5}])
// .then(getGeoJSONFromGeom)
// .then(console.log);





















module.exports = {
  // General
  getParcelGeometryJSON:      getParcelGeometryJSON,
  getParcelGeometryText:      getParcelGeometryText,
  getParcelGidByGeography:    getParcelGidByGeography, 
  convertToConvexHull:        convertToConvexHull,
  getParcelGid:               getParcelGid,
  addFlightPath:              addFlightPath,
  getPathConflicts:           getPathConflicts,
  makeAlternativePath:        makeAlternativePath
}

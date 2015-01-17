'use strict';
proj4.defs("ESRI:102243","+proj=lcc +lat_1=37.06666666666667 +lat_2=38.43333333333333 +lat_0=36.5 +lon_0=-120.5 +x_0=2000000 +y_0=500000 +ellps=GRS80 +units=m +no_defs");



L.mapbox.accessToken = 'pk.eyJ1IjoibGl6cG9ydDEwIiwiYSI6IkNnaGZuam8ifQ.ytq8ZMrhPrnoWQsPnfkZMQ';
var map_zoom18 = L.mapbox.map('map_zoom18', 'lizport10.c50bb8f1',{ zoomControl:false }).setView([0, 0], 1);
var map_zoom16 = L.mapbox.map('map_zoom16', 'lizport10.c50bb8f1',{ zoomControl:false }).setView([0, 0], 1);

var disableMapInteractions = function(map) {
  // Disable drag and zoom handlers.
  map.dragging.disable();
  map.touchZoom.disable();
  map.doubleClickZoom.disable();
  map.scrollWheelZoom.disable();

  // Disable tap handler, if present.
  if (map.tap) map.tap.disable();
}

disableMapInteractions(map_zoom18);
disableMapInteractions(map_zoom16);

// Generate a GeoJSON line. You could also load GeoJSON via AJAX
// or generate it some other way.
var geojson = { type: 'LineString', coordinates: [] };
var start = [ -122.28559970855713,37.829514190428945];
var momentum = [0.00001, 0.00001];

for (var i = 0; i < 500; i++) {
    start[0] += momentum[0];
    start[1] += momentum[1];
    geojson.coordinates.push(start.slice());
}
console.log(geojson);
// Add this generated geojson object to the map.
L.geoJson(geojson,{
    "weight": 3.5,
    "opacity": 0.65
}).addTo(map_zoom18);

L.geoJson(geojson,{
    "weight": 2,
    "opacity": 0.65
}).addTo(map_zoom16);

// Create a counter with a value of 0.
var j = 0;

// Create a marker and add it to the map.

var dIcon18 = L.icon({
  iconUrl: '../assets/images/d1.png',
  iconRetinaUrl: '../assets/images/d1.png',
  iconAnchor: [20, 20],
  iconSize: [40, 40]
});

var dIcon16 = L.icon({
  iconUrl: '../assets/images/d1.png',
  iconRetinaUrl: '../assets/images/d1.png',
  iconAnchor: [14, 14],
  iconSize: [28, 28]
});
var marker18 = L.marker([0, 0], {icon:dIcon18}).addTo(map_zoom18);
var marker16 = L.marker([0, 0], {icon:dIcon16}).addTo(map_zoom16);


tick();
function tick() {
    // Set the marker to be at the same point as one
    // of the segments or the line.
    marker18.setLatLng(L.latLng(
        geojson.coordinates[j][1],
        geojson.coordinates[j][0]));
    marker16.setLatLng(L.latLng(
        geojson.coordinates[j][1],
        geojson.coordinates[j][0]));

    // Move to the next point of the line
    // until `j` reaches the length of the array.
    if (++j < geojson.coordinates.length-1) setTimeout(tick, 100);
    map_zoom18.setView(L.latLng(
        geojson.coordinates[j][1],
        geojson.coordinates[j][0]), 18);
    map_zoom16.setView(L.latLng(
        geojson.coordinates[j][1],
        geojson.coordinates[j][0]), 16);
}

var stepMaps = {};

var transCoord = function( geo ) {

  if ( geo.type === 'LineString') {
    for ( var i = 0; i < geo.coordinates.length; i++ ) {
      geo.coordinates[i] = proj4("ESRI:102243","WGS84", geo.coordinates[i]);
    }
  } else if ( geo.type === 'Polygon' || geo.type === 'MultiLineString') {
    for ( var i = 0; i < geo.coordinates.length; i++ ) {
      for ( var j = 0; j < geo.coordinates[i].length; j++ ) {
        geo.coordinates[i][j] = proj4("ESRI:102243","WGS84", geo.coordinates[i][j]);
      }
    }
  } else if ( geo.type === 'MultiPolygon') {
    for ( var i = 0; i < geo.coordinates.length; i++ ) {
      for ( var j = 0; j < geo.coordinates[i].length; j++ ) {
        for ( var k = 0; k < geo.coordinates[i][j].length; k++ ) {
          geo.coordinates[i][j][k] = proj4("ESRI:102243","WGS84", geo.coordinates[i][j][k]);
        }
      }
    }
  }
};

var lineStyle = {
    "color": "#FF0000",
    "weight": 2,
    "opacity": 0.65
};

var multiLineStyle = {
    "color": "#009BDE",
    "weight": 3,
    "opacity": 1
};

var polyStyle = {
    "color": "#9E4D06",
    "weight": 3.5,
    "opacity": 0.65
};


var socket = io('http://tower.dronepass.org:8080');

// socket.on('TTC_rerouteInfoUpdate', function (data) {
//   console.log('data', data);
// });

socket.on('TTC_rerouteInfoUpdate', function (data) {
  socket.emit('TCT_fullReroutePackageUpdateAck',{});

  for ( var m in stepMaps ) {
    m.remove();
  }

  stepMaps = {
    conflict: L.mapbox.map('step_conflict', 'lizport10.c50bb8f1',{ zoomControl:false }).setView([0, 0], 1),
    split: L.mapbox.map('step_split', 'lizport10.c50bb8f1',{ zoomControl:false }).setView([0, 0], 1),
    ring: L.mapbox.map('step_ring', 'lizport10.c50bb8f1',{ zoomControl:false }).setView([0, 0], 1),
    reroute: L.mapbox.map('step_reroute', 'lizport10.c50bb8f1',{ zoomControl:false }).setView([0, 0], 1)
  }

  console.log('data', data);

  // CONFLICT
  data['conflict'].flightPath = JSON.parse(data['conflict'].flightPath);
  transCoord(data['conflict'].flightPath);
  data['conflict'].parcel = JSON.parse(data['conflict'].parcel);
  transCoord(data['conflict'].parcel);

  
  var L_flightPath = L.geoJson(data['conflict'].flightPath, {
    style: lineStyle
  });
  L_flightPath.addTo(stepMaps['conflict']);

  console.log("data['conflict'].parcel", data['conflict'].parcel);
  var L_parcel_conflict = L.geoJson(data['conflict'].parcel, {
    style: polyStyle
  });
  L_parcel_conflict.addTo(stepMaps['conflict']);

  stepMaps['conflict'].fitBounds(L_parcel_conflict.getBounds());

  // SPLIT
  data['split'].flightPath = JSON.parse(data['split'].flightPath);
  transCoord(data['split'].flightPath);

  var L_flightPath = L.geoJson(data['split'].flightPath, {
    style: lineStyle
  });
  L_flightPath.addTo(stepMaps['split']);

  var L_parcel = [];  
  for ( i = 0; i < data['split'].parcel.length; i++ ) {
    for ( j = 0; j < data['split'].parcel[i].length; j++ ) {
      data['split'].parcel[i][j] = JSON.parse(data['split'].parcel[i][j]);
      transCoord( data['split'].parcel[i][j] );

      console.log('gdi', data['split'].parcel[i][j]);

      L_parcel.push( L.geoJson(data['split'].parcel[i][j].parcel, {style: polyStyle}) );

      L_parcel[L_parcel.length-1].addTo(stepMaps['split']);
    }
  }
  // stepMaps['split'].fitBounds(L_parcel[0].getBounds());

  // RING
  data['ring'].flightPath = JSON.parse(data['ring'].flightPath);
  transCoord(data['ring'].flightPath);
  data['ring'].parcel = JSON.parse(data['ring'].parcel);
  transCoord(data['ring'].parcel);

  
  var L_flightPath = L.geoJson(data['ring'].flightPath, {
    style: lineStyle
  });
  // L_flightPath.addTo(stepMaps['ring']);

  data['ring'].parcel.coordinates.pop();
  var L_parcel_ring = L.geoJson(data['ring'].parcel, {
    style: multiLineStyle
  })
  L_parcel_ring.addTo(stepMaps['ring']);

  

  // REROUTE
  data['reroute'].flightPath = JSON.parse(data['reroute'].flightPath);
  transCoord(data['reroute'].flightPath);
  data['reroute'].parcel = JSON.parse(data['reroute'].parcel);
  transCoord(data['reroute'].parcel);
  
  var L_flightPath = L.geoJson(data['reroute'].flightPath, {
    style: lineStyle
  });
  L_flightPath.addTo(stepMaps['reroute']);

  var L_parcel_reroute = L.geoJson(data['reroute'].parcel, {
    style: polyStyle
  });
  L_parcel_reroute.addTo(stepMaps['reroute']);


  // fitting bounds

  stepMaps['conflict'].fitBounds(L_parcel_ring.getBounds());
  stepMaps['split'].fitBounds(L_parcel_ring.getBounds());
  stepMaps['ring'].fitBounds(L_parcel_ring.getBounds());
  stepMaps['reroute'].fitBounds(L_parcel_ring.getBounds());

  stepMaps['conflict'].setZoom(17);
  stepMaps['split'].setZoom(17);
  stepMaps['ring'].setZoom(17);
  stepMaps['reroute'].setZoom(17);

});


var transcriptsQueue = [];
setInterval(function(){
  socket.emit('TCT_getTranscripts',{});
},2000);

socket.on('TTC_updateTranscripts', function(msg) {

  if ( !msg[0] ) return ;

  for ( var i=0; i<msg.length; i++ ) {
    // create new message DOM
    var newMsg = $('<p></p>').text(msg[i].msg);

    // applying style accordingly
    if ( msg[i].sender === 'Drone' ) {
      newMsg.addClass('droneTalk');
    } else if ( msg[i].sender === 'Tower' ) {
      newMsg.addClass('towerTalk');
    }

    newMsg.hide().prependTo('#transcriptWindow').fadeIn("slow");
  }
});


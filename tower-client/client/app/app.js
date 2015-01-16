'use strict';

L.mapbox.accessToken = 'pk.eyJ1IjoibGl6cG9ydDEwIiwiYSI6IkNnaGZuam8ifQ.ytq8ZMrhPrnoWQsPnfkZMQ';
var map = L.mapbox.map('map', 'lizport10.c50bb8f1',{ zoomControl:false }).setView([0, 0], 1);

// Disable drag and zoom handlers.
map.dragging.disable();
map.touchZoom.disable();
map.doubleClickZoom.disable();
map.scrollWheelZoom.disable();

// Disable tap handler, if present.
if (map.tap) map.tap.disable();

// Generate a GeoJSON line. You could also load GeoJSON via AJAX
// or generate it some other way.
var geojson = { type: 'LineString', coordinates: [] };
var start = [ 37.829514190428945,-122.28559970855713];
var momentum = [0.00001, 0.00001];

for (var i = 0; i < 500; i++) {
    start[0] += momentum[0];
    start[1] += momentum[1];
    geojson.coordinates.push(start.slice());
}

// Add this generated geojson object to the map.
L.geoJson(geojson).addTo(map);

// Create a counter with a value of 0.
var j = 0;

// Create a marker and add it to the map.

var dIcon = L.icon({
  iconUrl: '../assets/images/d1.png',
  iconRetinaUrl: '../assets/images/d1.png',
  iconAnchor: [20, 20],
  iconSize: [40, 40]
});
var marker = L.marker([0, 0], {icon:dIcon}).addTo(map);

tick();
function tick() {
    // Set the marker to be at the same point as one
    // of the segments or the line.
    marker.setLatLng(L.latLng(
        geojson.coordinates[j][0],
        geojson.coordinates[j][1]));

    // Move to the next point of the line
    // until `j` reaches the length of the array.
    if (++j < geojson.coordinates.length) setTimeout(tick, 100);
    map.setView(L.latLng(
        geojson.coordinates[j][0],
        geojson.coordinates[j][1]), 18);
}

var step1 = L.mapbox.map('step1', 'lizport10.c50bb8f1',{ zoomControl:false }).setView([0, 0], 1);
step1.setView(L.latLng(start),17);


var step2 = L.mapbox.map('step2', 'lizport10.c50bb8f1',{ zoomControl:false }).setView([0, 0], 1);
var step3 = L.mapbox.map('step3', 'lizport10.c50bb8f1',{ zoomControl:false }).setView([0, 0], 1);
var step4 = L.mapbox.map('step4', 'lizport10.c50bb8f1',{ zoomControl:false }).setView([0, 0], 1);


var socket = io('http://tower.dronepass.org:8080');

socket.on('news', function (data) {
  console.log(data);
  socket.emit('my other event', { my: 'data' });
});
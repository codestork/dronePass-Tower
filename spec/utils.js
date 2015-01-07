var path = require('path');
var expect = require('chai').expect;
var pg = require(path.join(__dirname, '..', './server/db/config.js'));

var utils = require(path.join(__dirname, '..', './server/db/utils.js'));

describe('utils()', function () {
  'use strict';

  it('exists getParcelGeometryJSON', function () {
    expect(utils.getParcelGeometryJSON).to.be.a('function');
  });

  xit('exists addFlightPath', function () {
    //expect(utils.addFlightPath).to.be.a('function');
  });

  xit('exists getPathConflicts', function () {
    //expect(utils.getPathConflicts).to.be.a('function');
  });  

  // Add more assertions here
});

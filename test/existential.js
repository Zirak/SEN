var should = require('should');
var SEN;

describe('SEN', function () {
	it('should exist', function () {
		SEN = require('../sen.js').SEN;
	});

	it('should have decoding', function () {
		SEN.should.have.property('decode');
		SEN.should.have.property('parse');
	});

	it('should have encoding', function () {
		SEN.should.have.property('encode');
		SEN.should.have.property('stringify');
	});
});

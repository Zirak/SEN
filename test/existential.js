var should = require('should');
var SEN;

describe('SEN', function () {
	it('should exist', function () {
		SEN = require('../sen.js').SEN;
	});

	it('should have decoding', function () {
		SEN.should.have.property('decode').and.be.a('function');
		SEN.should.have.property('parse').and.be.a('function');
	});

	it('should have encoding', function () {
		SEN.should.have.property('encode').and.be.a('function');
		SEN.should.have.property('stringify').and.be.a('function');
	});
});

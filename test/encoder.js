var should = require('should'),
	SEN = require('../sen.js').SEN;

var str = SEN.stringify.bind(SEN);

describe('stringify', function () {
	describe('strings', function () {
		it('should escape quotes', function () {
			str('"foo"')    .should.equal('"foo"');
			str('\"foo\"')  .should.equal('\"foo\"');
			str('\\"foo\\"').should.equal('\\"foo\\"');
		});
	});

	describe('numbers', function () {
		it('should respect integers', function () {
			str(4).should.equal('4');
			str(10.2e4) .should.equal('102000');
			str(6.02e23).should.equal('6.02e+23');
		});

		it('should respect negatives', function () {
			str(-4) .should.equal('-4');
			str(-10.2e4) .should.equal('-102000');
			str(6.02e-23).should.equal('6.02e-23');
		});

		it('should respect decimals', function () {
			str(6.33) .should.equal('6.33');
			str(-6.33).should.equal('-6.33')
			str(6.33e-34).should.equal('6.33e-34');
		});
	});

	describe('arrays', function () {
		it('should respect the empty array', function () {
			str([]).should.equal('()');
		});

		it('should properly separate values', function () {
			str([0, 1]).should.equal('(0 1)');
		});

		it('should properly arbitrarily nest lists', function () {
			str([[0], [1]]).should.equal('((0) (1))');
			str([[0, 1], [2]]).should.equal('((0 1) (2))');
			str(
				['a', [['b', ['d', 'e']], 'c']]
			).should.equal(
				'(a ((b (d e)) c))');
		});

		//TODO: don't suck
	});

	//TODO: add p-lists
});

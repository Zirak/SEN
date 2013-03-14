var should = require('should'),
	SEN = require('../sen.js').SEN;

var str = SEN.stringify.bind(SEN);

describe('encode', function () {
	describe('atoms', function () {
		it('should return the literal value', function () {
			str('foo').should.equal('foo');
			str('f42').should.equal('f42');
		});

		it('should not parse symbols', function () {
			str(':foo').should.equal(':foo');
			str(':42') .should.equal(':42');
		});

		it('should accept quotes', function () {
			str('f"oo').should.equal('f"oo');
			str('foo"').should.equal('foo"');
		});
	});

	describe('strings', function () {
		it('should treat number-strings as strings', function () {
			str('42').should.equal('"42"');
			str('6.02').should.equal('"6.02"');
		});

		it('should stringify what looks like based-numbers', function () {
			str('#2r10').should.equal('"#2r10"');
		});

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

	describe('specials', function () {
		it('should properly encode true', function () {
			str(true).should.equal('t');
			str('t').should.equal('"t"');
		});

		it('should properly encode false', function () {
			str(false).should.equal('nil');
			str('false').should.equal('false');
		});

		it('should properly encode null', function () {
			str(null).should.equal('nil');
			str('nil').should.equal('"nil"')
		});

		it('should properly encode undefined', function () {
			str(undefined).should.equal('nil');
			str().should.equal('nil');

			str('undefined').should.equal('undefined');
		});
	});

	//TODO: add p-lists
});

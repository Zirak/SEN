var should = require('should'),
	SEN = require('../sen.js').SEN;

var dec = SEN.decode.bind(SEN);

describe('decode', function () {
	describe('atoms', function () {
		it('should return the literal value', function () {
			dec('foo').should.equal('foo');
			dec('f42').should.equal('f42');
			dec('foo"').should.equal('foo"');
		});

		it('should not parse symbols', function () {
			dec(':foo').should.equal(':foo');
			dec(':42').should.equal(':42');
		});
	});

	describe('strings', function () {

	});

	describe('lists', function () {
		it('should respect the empty list', function () {
			dec('()').should.eql([]);
		});

		//...seriously? dafuq past self?
		it('should do basic shit right', function () {
			dec('(0 1)').should.eql([0, 1]);
			dec('("a" "b")').should.eql(['a', 'b']);
		});

		describe('ignore excess whitespace', function () {
			it('should ignore extra spaces', function () {
				dec('(  )').should.eql([]);
				dec('(  0)').should.eql([0]);
				dec('(0  )').should.eql([0]);
			});

			it('should ignore extra tabs', function () {
				dec('(	)').should.eql([]);
				dec('(	0)').should.eql([0]);
				dec('(0	)').should.eql([0]);
			});

			it('should ignore wrapping newlines', function () {
				dec('\n()\n').should.eql([]);
				dec('(\n)').should.eql([]);
				dec('(0\n1)').should.eql([0, 1]);
			});
		});
	});

	describe('plists', function () {
		//ah, I see...
		it('should do basic shit', function () {
			dec('(:a 0)').should.eql({a : 0});
			dec('(:0 0)').should.eql({'0' : 0});
			dec('(:a 0 :1 b)').should.eql({a : 0, '1' : 'b'});
		});

		it('should treat symbols like atoms', function () {
			dec('(:"a" 0)').should.eql({'"a"' : 0});
		});

		it('should parse symbols literally', function () {
			dec('(:nil 0)').should.eql({nil : 0});
			dec('(:t 0)').should.eql({t : 0});
		});

		//TODO: test exceptions (keyless, valueless)
	});

	describe('comments', function () {
		it('should accept the commented program', function () {
			should.equal(dec(';'), null);
		});

		it('should be sane', function () {
			dec('0;1').should.equal(0);
			dec('(0;1\n)').should.eql([0]);
			dec('(0;1\n1)').should.eql([0, 1]);
		});
	});
});

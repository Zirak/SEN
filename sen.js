/*
 * This work is free. You can redistribute it and/or modify it under the terms
 * of the Do What The Fuck You Want To Public License, Version 2, as published
 * by Sam Hocevar. See the COPYING file and http://wtfpl.net for more details.
 */

/* global SEN:true */
/* jshint devel:true, node:true */
var SEN = {};
if (typeof exports !== 'undefined') {
	exports.SEN = SEN;
}

(function () {
"use strict";

//token declarations

//you know shit got serious when you write in capital letters
var TK = {
	BEGIN_SEXP : '(',
	END_SEXP   : ')',

	STRING     : '"',
	ESCAPE     : '\\',
	SYMBOL_KEY : ':',

	SEPARATOR  : ' ',
	NEWLINE    : '\n',

	COMMENT    : ';',

	NIL        : 'nil',
	TRUE       : 't',

	ZALGO      : '̳̲͎̟͚̰͈͂̾̋͌ͩ̅̎́Z̸̲͕̺̼͗̋̀́A͔̒͂ͬ̃̋ͭ͛̚L͉̹̟̙̆ͯ̓̀̅̄͗ͬ̕G͒̔ͣ̾ͮͭ̇͊͏̴͚͇̟̬̤̖̞̕ͅỎ̵̲̮͎͕͎͙̤̾̂̈́ͣ̂́!̛̺̙͎͕̹̍͛ͧ̇͋̃͑'
};

var SEPARATORS = truthMap([
	TK.BEGIN_SEXP, TK.END_SEXP,
	TK.SEPARATOR, TK.NEWLINE,
	TK.COMMENT
]);
var RESERVED = truthMap([
	TK.NIL, TK.TRUE
]);

//SEN.parse will be exposed at the end

var parser = {
	//the value representing the lack of a token. take attention of it when
	// translating tokens
	VOID : {},

	tokens : [],

	registerToken : function (token) {
		this.tokens.push(token);
	},
	registerTokens : function (arr) {
		arr.map(this.registerToken, this);
	},

	reinit : function (src) {
		this.src = src;
		this.idx = 0;
	},
	parse : function (src) {
		return this.toAST(src).translate();
	},
	toAST : function (src) {
		this.reinit(src);

		var root = this.tokenize();
		this.src = null; //cleanup

		if (this.idx < src.length) {
			console.warn('SEN.parse: Trailing characters after last value');
		}

		return root;
	},

	//TODO: better API? keep track of line/columns?
	current : function () {
		return this.src[this.idx];
	},
	skip : function () {
		this.idx += 1;
	},
	nextChar : function () {
		this.skip();
		return this.current();
	},
	peek : function () {
		return this.src[this.idx + 1];
	},

	skipMatching : function (re) {
		var src = this.src,
			i = this.idx; //why? because.

		while (re.test(src[i])) {
			i += 1;
		}
		this.idx = i;
	},

	skipWhitespace : function () {
		this.skipMatching(/\s/);
	},

	skipLine : function () {
		var ch = this.current();
		while (ch && ch !== '\n') {
			ch = this.nextChar();
		}

		//we may or may not be on an EOL. if we are, skip over it
		if (ch === '\n') {
			this.skip();
		}
	}
};

parser.tokenize = function () {
	var ch = parser.current(),
		value, tok;

	if (!ch) {
		return this.VOID;
	}
	//a comment is not defined as a value, but as an exception to regular rules.
	//therefore, it will not be recognized unless we explicitly recognize it.
	if (comment.startsWith(ch)) {
		comment.parse();
		return parser.tokenize();
	}

	var idx = this.idx;
	for (var i = 0; i < this.tokens.length; value = undefined, i++) {
		tok = this.tokens[i];

		if (tok.startsWith(ch)) {
			value = tok.tokenize();
		}

		if (value && value !== this.VOID) {
			return value;
		}
		//roll backwards, in case there was a partial match
		this.idx = idx;
	}

	if (!value) {
		throw new SyntaxError('Could not handle char ' + ch);
	}
};

var comment = {
	startsWith : function (ch) {
		return ch === TK.COMMENT;
	},

	parse : function () {
		parser.skipLine();
	}
};

var list = {
	name : 'list',

	startsWith : function (ch) {
		return ch === TK.BEGIN_SEXP;
	},

	token : function (value) {
		return {
			type : 'list',
			translate : this.translate,
			value : value || []
		};
	},

	tokenize : function () {
		//we're on a (, skip it and any whitespace
		parser.skip();
		parser.skipWhitespace();

		var ch = parser.current(),
			child,
			val;

		//a list who's first value is a symbol is a plist
		if (symbol.startsWith(ch)) {
			return plist.tokenize();
		}

		val = [];

		while (ch !== TK.END_SEXP) {
			if (!ch) {
				//TODO: find a way to do graceful event failure
				throw new SyntaxError('Unbalanced sexp');
			}

			child = parser.tokenize();
			if (child !== parser.VOID) {
				val.push(child);
			}

			parser.skipWhitespace();
			ch = parser.current();
		}

		//skip over closing )
		parser.skip();

		return this.token(val);
	},

	translate : function () {
		return this.value.map(innerTranslate);

		function innerTranslate (tok) {
			return tok.translate();
		}
	}
};

//this will not be added, since it's derived from the list token
var plist = {
	name : 'plist',

	token : function (value) {
		return {
			type : 'plist',
			translate : this.translate,
			value : value || []
		};
	},

	tokenize : function () {
		var ch = parser.current(),
			val = [];

		var key, value;
		while (ch !== TK.END_SEXP) {
			if (!ch) {
				throw new SyntaxError('Unbalanced sexp');
			}

			key = symbol.tokenize();
			parser.skipWhitespace();
			value = parser.tokenize();
			parser.skipWhitespace();

			//TODO: extract to atom
			if (value === parser.VOID) {
				value = { value : null, translate : literalValue };
			}

			val.push({
				key : key, value : value
			});
			ch = parser.current();
		}

		//skip over closing )
		parser.skip();

		return this.token(val);
	},

	translate : function () {
		var obj = this.value;
		return Object.keys(obj).reduce(pairTranslate, {});

		function pairTranslate (ret, key) {
			var pair = obj[key];
			ret[pair.key.translate()] = pair.value.translate();
			return ret;
		}
	}
};

var string = {
	name : 'string',

	startsWith : function (ch) {
		return ch === TK.STRING;
	},

	token : function (value) {
		return {
			type : 'string',
			translate : this.translate,
			value : value || ""
		};
	},

	tokenize : function () {
		//we're on a " right now
		var ch = parser.nextChar(),
			val = '',
			escape = false;

		while (ch !== TK.STRING || escape) {
			if (!ch) {
				throw new SyntaxError('Unterminated string');
			}

			if (ch === TK.ESCAPE && !escape) {
				escape = true;
			}
			else {
				val += ch;
				escape = false;
			}

			ch = parser.nextChar();
		}

		//skip over the ending "
		parser.skip();

		return this.token(val);
	},

	translate : literalValue
};

var number = {
	name : 'number',

	starts : truthMap([
		'#', '+', '-'
	]),
	startsWith : function (ch) {
		return this.starts[ch] || this.isDigit(ch);
	},

	token : function (value, radix) {
		return {
			type : 'number',
			translate : this.translate,
			value : value || '',
			radix : radix || 10
		};
	},

	tokenize : function () {
		var ch = parser.current();

		var ret;
		if (ch === '#') {
			ret = this.tokenizeBased();
		}
		ret = this.tokenizeLiteral();

		ch = parser.current();
		if (ch && !SEPARATORS[ch]) {
			return parser.VOID;
		}
		return ret;
	},

	tokenizeLiteral : function () {
		var ch = parser.current(),
			sign, integer = '', decimal = '', exponent = '',
			val;

		sign = this.parseSign();
		integer = this.parseDigits();

		ch = parser.current();
		if (ch === '.') {
			parser.skip();
			decimal = '.' + this.parseDigits();
		}
		ch = parser.current();
		if (ch === 'e' || ch === 'E') {
			exponent = this.parseExponent();
		}

		val = sign + integer + decimal + exponent;
		return this.token(val, 10);
	},

	tokenizeBased : function () {
		parser.skip(); //pass over #
		var radix = this.parseRadix(),
			sign = this.parseSign(),
			digits = this.parseDigits(radix);

		if (!digits) {
			throw new SyntaxError('missing number in based literal');
		}
		return this.token(sign + digits, radix);
	},

	parseDigits : function (radix) {
		var ch = parser.current(),
			val = '';

		while (ch && this.isDigit(ch, radix)) {
			val += ch;
			ch = parser.nextChar();
		}

		return val.toLowerCase();
	},

	parseExponent : function (radix) {
		var ch = parser.current(),
			sign, digits;

		if (!ch || ch.toLowerCase() !== 'e') {
			throw new SyntaxError('number exponent error'); //meh
		}
		parser.skip();

		sign = this.parseSign();
		digits = this.parseDigits(radix);

		if (!digits) {
			throw new SyntaxError('exponent cannot be blank');
		}

		return 'e' + sign + digits;
	},

	parseSign : function () {
		var ch = parser.current(),
			ret = '';

		switch (ch) {
		case '-':
			ret = '-';
			//intentional fall-through
		case '+':
			parser.skip();
			break;
		}

		return ret;
	},

	parseRadix : function () {
		var ch = parser.current(),
			val = '';

		while (ch && this.isDigit(ch)) {
			val += ch;
			ch = parser.nextChar();
		}

		if (!ch || ch.toLowerCase() !== 'r') {
			throw new SyntaxError('number missing in #R');
		}

		var n = +val;
		if (!val) {
			throw new SyntaxError('radix missing in #R');
		}
		else if (val < 2 || val > 36) {
			throw new SyntaxError('illegal radix for #R: ' + val);
		}

		//move past R
		parser.skip();

		return n;
	},

	translate : function () {
		var n;

		if (this.radix === 10) {
			n = parseFloat(this.value);
		}
		else {
			n = parseInt(this.value, this.radix);
		}

		return n;
	},

	digits : '0123456789abcdefghijklmnopqrstuvwxyz'.split(''),
	digits10 : truthMap('0123456789'.split('')),
	isDigit : function (ch, radix) {
		ch = ch.toLowerCase();

		if (!radix) {
			return this.digits10[ch];
		}
		return this.digits.slice(0, radix).indexOf(ch) > -1;
	}
};

var symbol = {
	name : 'symbol',

	startsWith : function (ch) {
		return ch === TK.SYMBOL_KEY;
	},

	tokenize : function () {
		if (parser.current() !== TK.SYMBOL_KEY) {
			throw new SyntaxError('symbols must begin with ' + TK.SYMBOL_KEY);
		}
		parser.skip();

		var ret = atom.tokenize();

		if (ret !== parser.VOID) {
			ret.type = 'symbol';
			ret.translate = literalValue;
		}

		return ret;
	}
};

var atom = {
	name : 'atom',

	special : (function () {
		var ret = {};
		ret[TK.NIL] = null;
		ret[TK.TRUE] = true;

		return ret;
	})(),

	startsWith : function () {
		return true;
	},

	token : function (value) {
		return {
			type : 'atom',
			translate : this.translate,
			value : value || ''
		};
	},

	tokenize : function () {
		var val = '',
			ch = parser.current();

		while (ch && !SEPARATORS[ch]) {
			val += ch;
			ch = parser.nextChar();
		}

		if (val === '') {
			return parser.VOID;
		}

		return this.token(val);
	},

	translate : function () {
		var val = this.value;

		if (atom.special.hasOwnProperty(val)) {
			val = atom.special[val];
		}
		return val;
	}
};

parser.registerTokens([
	list,
	string, number, atom
]);


//SEN.stringify will also be exposed in the epilogue
var encoder = {
	//h4x needed for leniant atom detection
	sepRe : (function () {
		var seps = Object.keys(SEPARATORS),
			res  = Object.keys(RESERVED),

			numeric = '^[\\d#]';

		return new RegExp(
			[numeric + '|\\' + seps.join('|\\'), res.join('|')].join('|'),
			'i');
	})(),

	reinit : function (beautify) {
		if (beautify) {
			this.lineSep = '\n';
			this.indentChar = ' ';
		}
		else {
			this.lineSep = '';
			this.indentChar = '';
		}
		this.indent = '';
	},

	encode : function (val) {
		var res;

		switch (typeof val) {
		case 'string':
			return this.quote(val);
		case 'number':
			return String(val);

		case 'boolean':
			if (val === true) {
				return TK.TRUE;
			}
			//intentional fall-through. we want false to map to the same value
			// as undefined/null

		case 'undefined':
		case 'null': //added in vain hope that it will work one day
			return TK.NIL;

		case 'object':
			if (!val) {
				return TK.NIL;
			}

			this.indent += this.indentChar;

			if (Array.isArray(val)) {
				res = this.encodeArray(val);
			}
			else {
				res = this.encodeObject(val);
			}

			return res;

		default:
			throw new SyntaxError('aint nobody got encoding fo dat');
		}
	},

	//takes a string and dresses it up nice and tidy
	quote : function (string) {
		//check to see whether we can represent it as an atom
		if (!this.sepRe.test(string)) {
			return string;
		}
		return '"' +
			string.replace(/\n/g, '\\n').replace(/"/g, '\\"') +
			'"';
	},

	encodeArray : function (arr) {
		if (!arr.length) {
			return TK.BEGIN_SEXP + TK.END_SEXP;
		}

		var encoded =
			arr.map(this.encode, this)
			.join(TK.SEPARATOR + this.lineSep + this.indent);

		return TK.BEGIN_SEXP + encoded + TK.END_SEXP;
	},

	encodeObject : function (obj) {
		var keys = Object.keys(obj);

		if (!keys.length) {
			return TK.BEGIN_SEXP + TK.END_SEXP;
		}

		var encoded =
			keys.map(encodePair.bind(this, obj))
			.join(TK.SEPARATOR + this.lineSep + this.indent);

		return TK.BEGIN_SEXP + encoded + TK.END_SEXP;

		function encodePair (obj, key) {
			return (TK.SYMBOL_KEY + String(key) +
					TK.SEPARATOR  + this.encode(obj[key]) );
		}
	}
};

//utility method
function literalValue () { /*jshint validthis:true*/ return this.value; }
function truthMap (keys) {
	return keys.reduce(assignTrue, Object.create(null));

	function assignTrue (map, key) {
		map[key] = true;
		return map;
	}
}

//BOO!

//as specified in http://es5.github.com/#x15.12.2
SEN.decode = SEN.parse = function (sen, reviver) {
	var unfiltered = parser.parse(sen),
		root;

	if (reviver && reviver.call) {
		root = { '': unfiltered };
		return walk(root, '');
	}
	return unfiltered;

	function walk (holder, key) {
		var val = holder[key], item,
			i, len;

		if (Array.isArray(val)) {
			for (i = 0, len = val.length; i < len; i += 1) {
				item = walk(val, i);
				resolve(val, i, item);
			}
		}
		else if (val && typeof val === 'object') {
			var keys = Object.keys(val);

			for (i = 0, len = keys.length; i < len; i += 1) {
				item = walk(val, keys[i]);
				resolve(val, keys[i], item);
			}
		}

		return reviver.call(holder, key, val);
	}

	function resolve (holder, key, item) {
		if (item === undefined) {
			delete holder[key];
		}
		else {
			holder[key] = item;
		}
	}
};

SEN.encode = SEN.stringify = function (obj, replacer, spaces) {
	encoder.reinit(!!spaces);
	return encoder.encode(obj);
};

//for debugging. TODO: remove the following
//TODO: check TODOs
SEN.parser = parser;
SEN.encoder = encoder;
})();

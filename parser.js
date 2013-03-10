if (typeof SEN === 'undefined') {
	SEN = {};
}

(function () {
"use strict";

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
			console.warn('SEN.parse: Trailing characters after last value')
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
		ch === '\n' && this.skip();
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

	for (var i = 0; i < this.tokens.length; value = undefined, i++) {
		tok = this.tokens[i];

		if (tok.startsWith(ch)) {
			value = tok.tokenize();
		}

		if (value) {
			return value;
		}
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
				throw new SyntaxError('Unbalanced sexp')
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

//TODO: remove exposure after debugging
var number = window.number= {
	name : 'number',

	starts : TruthMap([
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
		}
	},

	tokenize : function () {
		var ch = parser.current();

		if (ch === '#') {
			return this.tokenizeBased();
		}
		return this.tokenizeLiteral();
	},

	tokenizeLiteral : function () {
		var ch = parser.current(),
			val,
			sign;

		sign = this.parseSign();
		val  = this.parseDigits();

		ch = parser.current();
		if (ch === '.') {
			parser.skip();
			val += '.' + this.parseDigits();
		}

		var ret = this.token(val, 10);
		ret.sign = sign;

		return ret;
	},

	parseDigits : function (radix) {
		var ch = parser.current(),
			val = '';

		while (ch && this.isDigit(ch)) {
			val += ch;
			ch = parser.nextChar();
		}

		return val;
	},

	parseSign : function () {
		var ch = parser.current(),
			ret = +1;

		switch (ch) {
		case '-':
			ret = -1;
			//intentional fall-through
		case '+':
			parser.skip();
			break;
		}

		return ret;
	},

	translate : function () {
		var n;

		if (this.radix === 10) {
			n = parseFloat(this.value);
		}
		else {
			n = parseInt(this.value, this.radix);
		}

		return this.sign * n;
	},

	digits : '0123456789abcdefghijklmnopqrstuvwxyz'.split(''),
	digits10 : TruthMap('012345679'.split('')),
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

	not : TruthMap([
		TK.BEGIN_SEXP, TK.END_SEXP,
		TK.SEPARATOR, TK.NEWLINE,
		TK.COMMENT
	]),

	special : (function () {
		var ret = {};
		ret[TK.NIL] = null;
		ret[TK.TRUE] = true;

		return ret;
	})(),

	startsWith : function (ch) {
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

		while (ch && !this.not[ch]) {
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

//utility method
function literalValue () { return this.value; }
function TruthMap (keys) {
	return keys.reduce(assignTrue, Object.create(null));

	function assignTrue (map, key) {
		map[key] = true;
		return map;
	}
}

//BOO!
SEN.parse = parser.parse.bind(parser);

//for debugging. TODO: remove the following
//TODO: check TODOs
SEN.parser = parser;
})();

if (typeof SEN === 'undefined') {
	SEN = {};
}

(function () {
"use strict";

//SEN.parse will be exposed at the end

var parser = {
	//use this property to signify the lack of a valid value
	VOID : {},

	//this variable abuses the fact that arrays are regular objects. tokens
	// are saved in the order they were added, but you can also access them
	// using individual token names. so for instance:
	// parser.tokens[0] === parser.tokens.list
	//tokens should be ordered by priority
	tokens : [],

	registerToken : function (token) {
		this.tokens.push(token);
		this.tokens[token.name] = token;
	},
	registerTokens : function (arr) {
		arr.map(this.registerToken, this);
	},

	reinit : function (src) {
		this.src = src;
		this.idx = 0;
	},
	parse : function (src) {
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
		value = this.VOID, tok;

	if (!ch) {
		return '';
	}

	for (var i = 0; i < this.tokens.length; value = this.VOID, i++) {
		tok = this.tokens[i];

		if (tok.startsWith(ch)) {
			value = tok.tokenize();
		}

		//this sucks
		if (value !== this.VOID) {
			break;
		}
	}

	if (!value) {
		throw new SyntaxError('Could not handle char ' + ch);
	}
	return value;
};

var list = {
	name : 'list',

	startsWith : function (ch) {
		return ch === TK.BEGIN_SEXP;
	},

	tokenize : function () {
		//we're on a (, skip it and any whitespace
		parser.skip();
		parser.skipWhitespace();

		var ch = parser.current(),
			ret = [];

		//a list who's first value is a symbol is a plist
		if (symbol.startsWith(ch)) {
			return plist.tokenize();
		}

		while (ch !== TK.END_SEXP) {
			if (!ch) {
				//TODO: find a way to do graceful event failure
				throw new SyntaxError('Unbalanced sexp')
			}

			ret.push(parser.tokenize());

			parser.skipWhitespace();
			ch = parser.current();
		}

		//skip over closing )
		parser.skip();

		return ret;
	}
};

//this will not be added, since it's derived from the list token
var plist = {
	name : 'plist',

	tokenize : function () {
		var ch = parser.current(),
			ret = {};

		var key, value;
		while (ch !== TK.END_SEXP) {
			if (!ch) {
				throw new SyntaxError('Unbalanced sexp');
			}

			key = parser.tokenize();
			parser.skipWhitespace();
			value = parser.tokenize();

			ret[key] = value;
			ch = parser.current();
		}

		//skip over closing )
		parser.skip();

		return ret;
	}
};

var string = {
	name : 'string',

	startsWith : function (ch) {
		return ch === TK.STRING;
	},

	tokenize : function () {
		//we're on a " right now
		var ch = parser.nextChar(),
			ret = '',
			escape = false;

		while (ch !== TK.STRING || escape) {
			if (!ch) {
				throw new SyntaxError('Unterminated string');
			}

			if (ch === TK.ESCAPE && !escape) {
				escape = true;
			}
			else {
				ret += ch;
				escape = false;
			}

			ch = parser.nextChar();
		}

		//skip over the ending "
		parser.skip();

		return ret;
	}
};

var symbol = {
	name : 'symbol',

	startsWith : function (ch) {
		return ch === TK.SYMBOL_KEY;
	},

	tokenize : function () {
		parser.skip();

		return atom.tokenize();
	}
};

var atom = {
	name : 'atom',

	not : TruthMap([
		TK.BEGIN_SEXP, TK.END_SEXP,
		TK.SEPARATOR
	]),

	startsWith : function (ch) {
		return true;
	},

	tokenize : function () {
		var ret = '';

		var ch = parser.current();

		while (ch && !this.not[ch]) {
			ret += ch;
			ch = parser.nextChar();
		}

		return ret;
	}
};

parser.registerTokens([
	list,
	string, symbol, atom
]);

//utility method
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

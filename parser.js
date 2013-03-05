if (typeof SEN === 'undefined') {
	SEN = {};
}

(function () {
"use strict";

//SEN.parse will be exposed at the end

var parser = {
	reinit : function (src) {
		this.src = src;
		this.idx = 0;
	},
	parse : function (src) {
		this.reinit(src);

		var root = this.tokenize();
		this.src = null; //cleanup

		return this.translate(root);
	},

	//accepts a token, returns a js value representing it
	translate : function translate (token) {
		var type = token.type;
		if (this.translators.hasOwnProperty(type)) {
			return this.translators[type](token);
		}

		throw new Error(
			'Unknown token type ' + type + ', commencing pants-shitting');
	},

	translators : (function () {
		var ret = {
			atom : function (token) {
				return token.value;
			},
			sexp : function (token) {
				return token.value.map(parser.translate, parser);
			},
			plist : function (token) {
				return token.value.reduce(dictKey, {});
			}
		};
		ret.symbol = ret.atom;

		return ret;

		function dictKey (ret, pair) {
			//I dare you to say this 3 times fast
			ret[pair.key.value] = parser.translate(pair.value);
			return ret;
		}
	})(),

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
		this.skipMatching(/[^\n]/);
		//for the \n we passed over in the loop
		this.skip();
	}
};

parser.tokenize = function () {
	var ch = this.src[this.idx];

	if (!ch) {
		return '';
	}
	else if (ch === TK.COMMENT) {
		this.skipLine();
		return this.tokenize();
	}

	if (ch === TK.BEGIN_SEXP) {
		return this.sexp.tokenize();
	}
	return this.atom.tokenize();
};

parser.atom = {
	not : (function () {
		return [
			TK.SEPARATOR,
			TK.NEWLINE,

			TK.BEGIN_SEXP,
			TK.END_SEXP,

			TK.COMMENT
		].reduce(assignTrue, {});

		function assignTrue (ret, key) {
			ret[key] = true;
			return ret;
		}
	})(),

	special : {
		'nil' : null,
		't'   : true,
	},

	tokenize : function () {
		var ret = {
			type   : 'atom',
			value  : ''
		};

		var ch = parser.current();

		if (ch === TK.SYMBOL_KEY) {
			ret.type = 'symbol';
			ch = parser.nextChar();
		}

		while (ch && !this.not[ch]) {
			ret.value += ch;
			ch = parser.nextChar();
		}

		if (ret.type !== 'symbol' && this.special.hasOwnProperty(ret.value)) {
			ret.value = this.special[ret.value];
		}

		return ret;
	}
};

parser.sexp = {
	tokenize : function () {
		//a special case of sexps is the property-list, plist
		if (parser.peek() === TK.SYMBOL_KEY) {
			return parser.plist.tokenize();
		}

		var ret = {
			type   : 'sexp',
			value  : [],
		};

		//we're on a (, move to next non-whitespace char
		parser.skip();
		parser.skipWhitespace();

		var ch = parser.current(),
			child;
		while (ch !== TK.END_SEXP) {
			if (!ch) {
				throw new SyntaxError('Unbalanced sexp');
			}

			child = parser.tokenize();
			ret.value.push(child);

			parser.skipWhitespace();
			ch = parser.current();
		}

		//move over the )
		parser.skip();

		return ret;
	}
};
parser.plist = {
	tokenize : function () {
		var ret = {
			type    : 'plist',
			value   : [],
		};

		//we're on a (, move past that and whitespace
		parser.skip();
		parser.skipWhitespace();

		var ch = parser.current(),
			key, value;
		//before we continue, I would like to apologize to several people:
		//my mother, who through years of abuse has only made me come to this;'
		//my father, who had to put up with my mother and I;
		//my imaginary girlfriend, who took A LOT of crap;
		//to you, my good reader, for betraying a piece of your soul in this
		// stranger's journey.
		//last but not least, to future me. I'm sorry.
		while (ch !== TK.END_SEXP) {
			if (!ch) {
				throw new SyntaxError('unbalanced sexp');
			}

			key = this.tokenizeKey();
			parser.skipWhitespace();

			value = this.tokenizeValue();
			parser.skipWhitespace();

			ret.value.push({
				key   : key,
				value : value
			});

			ch = parser.current();
		}

		//move over the )
		parser.skip();

		return ret;
	},

	tokenizeKey : function () {
		var key = parser.tokenize();

		//because nil (null) is a possible value, we have to strictly check
		// against the empty string as a no-value
		if (key.value === '') {
			throw new SyntaxError('keyless');
		}
		else if (key.type !== 'symbol') {
			throw new SyntaxError('plist key must be a symbol');
		}

		return key;
	},
	tokenizeValue : function () {
		var value = parser.tokenize();

		//see comment in tokenizeKey
		if (value.value === '') {
			throw new SyntaxError('valueless tramp');
		}

		return value;
	}
};

//BOO!
SEN.parse = parser.parse.bind(parser);

//for debugging. TODO: remove the following
//TODO: check TODOs
SEN.parser = parser;
})();
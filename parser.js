"use strict";

var parser = {
	parse : function (src) {
		this.src = src;
		this.idx = 0;

		var root = this.tokenize();
		this.src = null; //cleanup

		return this.translate(root);
	},

	//accepts a token, returns a js value representing it
	translate : function translate (token) {
		var translators = {
			atom : function (token) {
				return token.value;
			},
			sexp : function (token) {
				return token.value.map(translate);
			},
			dict : function (token) {
				return token.value.reduce(dictKey, {});
			}
		};

		var type = token.type;
		if (translators[type]) {
			return translators[type](token);
		}

		throw new Error(
			'Unknown token type ' + type + ', commencing pants-shitting');

		function dictKey (ret, pair) {
			//I dare you to say this 3 times fast
			ret[pair.key.value] = translate(pair.value);
			return ret;
		}
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
		//+1 for the \n we passed over in the loop
		this.idx += 1;
	}
};

var tokenize = parser.tokenize = function () {
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

var atom = parser.atom = {
	not : TruthMap([
		TK.SEPARATOR,
		TK.NEWLINE,

		TK.BEGIN_SEXP,
		TK.END_SEXP,

		TK.COMMENT
	]),

	tokenize : function () {
		var src = parser.src;
		var ret = {
			type   : 'atom',
			value  : ''
		};

		//this is rather convoluted
		while (src[parser.idx] && !this.not[src[parser.idx]]) {
			ret.value += src[parser.idx];
			parser.idx += 1;
		}

		return ret;
	}
};

var sexp = parser.sexp = {
	tokenize : function () {
		var src = parser.src;

		//a special case of sexps is the dictionary
		if (src[parser.idx+1] === TK.DICT_KEY) {
			return parser.dict.tokenize();
		}

		var ret = {
			type   : 'sexp',
			value  : [],
		};

		//we're on a (, move to next non-whitespace char
		parser.idx += 1;
		parser.skipWhitespace();

		var child;
		while (src[parser.idx] !== TK.END_SEXP) {
			if (!src[parser.idx]) {
				throw new SyntaxError('Unbalanced sexp');
			}

			child = parser.tokenize();
			//handle \n)
			if (child.value) {
				ret.value.push(child);
			}
			parser.skipWhitespace();
		}

		//move over the )
		parser.idx += 1;

		return ret;
	}
};
var dict = parser.dict = {
	tokenize : function () {
		var src = parser.src;

		var ret = {
			type    : 'dict',
			value   : [],
		};

		//we're on a (, move past that and whitespace
		parser.idx += 1;
		parser.skipWhitespace();

		var key, value;
		//before we continue, I would like to apologize to several people:
		//my mother, who through years of abuse has only made me come to this;'
		//my father, who had to put up with my mother and I;
		//my imaginary girlfriend, who took A LOT of crap;
		//to you, my good reader, for betraying a piece of your soul in this
		// stranger's journey.
		//last but not least, to future me. I'm sorry.
		while (src[parser.idx] !== TK.END_SEXP) {
			if (!src[parser.idx]) {
				throw new SyntaxError('unbalanced sexp');
			}
			if (src[parser.idx] !== TK.DICT_KEY) {
				throw new SyntaxError(
					'dicts must only contain :key value pairs');
			}
			parser.idx += 1; //move past :

			key = parser.tokenize();

			if (!key.value) {
				throw new SyntaxError('keyless');
			}
			else if (key.type !== 'atom') {
				throw new SyntaxError('dict key must be an atom');
			}

			parser.skipWhitespace();

			value = parser.tokenize();

			if (!value.value) {
				throw new SyntaxError('valueless tramp');
			}

			parser.skipWhitespace();

			ret.value.push({
				key : key,
				value : value
			});
		}

		//move over the )
		parser.idx += 1;

		return ret;
	}
};

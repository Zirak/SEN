"use strict";

var parse = function (src) {
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
	var root = tokenize(src, 0);

	return translate(root);

	function translate (token) {
		var type = token.type;
		if (translators[type]) {
			return translators[type](token);
		}

		throw new Error(
			'Unknown token type ' + type + ', commencing pants-shitting');
	}

	function dictKey (ret, pair) {
		//I dare you to say this 3 times fast
		ret[pair.key.value] = translate(pair.value);
		return ret;
	}
};

var encode = function (val) {

	switch (typeof val) {
	case 'string': case 'number':
		return String(val);

	case 'boolean':
		if (val === true) {
			return TK.TRUE;
		}
		//intentional fall-through. we want false to map to the same value as
		// undefined/null

	case 'undefined':
	case 'null': //added in vain hope that it will work one day
		return TK.NIL;

	case 'object':
		if (!val) {
			return TK.NIL;
		}
		else if (Array.isArray(val)) {
			return encodeArray(val);
		}
		return encodeObject(val);

	default:
		throw new SyntaxError('aint nobody got encoding fo dat');
	}

	function encodeArray (arr) {
		return (
			TK.BEGIN_SEXP +
			arr.map(encode).join(TK.SEPARATOR) +
			TK.END_SEXP );
	}
	function encodeObject (obj) {
		return (
			TK.BEGIN_SEXP +
			Object.keys(obj).map(encodePair(obj)).join(TK.SEPARATOR) +
			TK.END_SEXP );
	}

	function encodePair (obj) {
		return function (key) {
			return (
				TK.DICT_KEY + encode(key) +
				TK.SEPARATOR + encode(obj[key]) );
		};
	}
};

var tokenize = function (str, idx) {
	var ch = str[idx];
	if (!ch) {
		return '';
	}
	if (ch === TK.COMMENT) {
		return tokenize(str, idx+lineOffset(str, idx));
	}
	if (str[idx] === TK.BEGIN_SEXP) {
		return sexp.tokenize(str, idx);
	}
	return atom.tokenize(str, idx);
};

var sexp = {
	tokenize : function (src, idx) {
		//a special case of sexps is the dictionary
		if (src[idx+1] === TK.DICT_KEY) {
			return dict.tokenize(src, idx);
		}

		var ret = {
			type   : 'sexp',
			value  : [],
			offset : idx
		};

		//we're on a (, move to next non-whitespace char
		idx += 1 + whitespaceOffset(src, idx);

		var child;
		while (src[idx] !== TK.END_SEXP) {
			//handling the nutjobs
			if (!src[idx]) {
				throw new SyntaxError('Unbalanced sexp');
			}

			child = tokenize(src, idx);
			//handle \n)
			if (child.value) {
				ret.value.push(child);
			}
			idx += child.offset;
			idx += whitespaceOffset(src, idx);
		}

		ret.offset = idx - ret.offset + 1; //+1 for the )

		return ret;
	}
};
var dict = {
	tokenize : function (src, idx) {
		var ret = {
			type    : 'dict',
			value   : [],
			offset : idx
		};

		//we're on a (, move past that and whitespace
		idx += 1;
		idx +=  whitespaceOffset(src, idx);

		var key, value;
		//before we continue, I would like to apologize to several people:
		//my mother, who through years of abuse has only made me come to this;'
		//my father, who had to put up with my mother and I;
		//my imaginary girlfriend, who took A LOT of crap;
		//to you, my good reader, for betraying a piece of your soul in this
		// stranger's journey.
		//last but not least, to future me. I'm sorry.
		while (src[idx] !== TK.END_SEXP && src[idx] !== TK.COMMENT) {
			if (src[idx] !== TK.DICT_KEY) {
				throw new SyntaxError(
					'dicts must only contain :key value pairs');
			}
			idx += 1; //move past :

			key = tokenize(src, idx);

			if (!key.value) {
				throw new SyntaxError('keyless');
			}
			else if (key.type !== 'atom') {
				throw new SyntaxError('dict key must be an atom');
			}

			idx += key.offset;
			idx += whitespaceOffset(src, idx);

			value = tokenize(src, idx);

			if (!value.value) {
				throw new SyntaxError('valueless tramp');
			}

			idx += value.offset;
			idx += whitespaceOffset(src, idx);

			ret.value.push({
				key : key,
				value : value
			});

			if (!src[idx]) {
				throw new SyntaxError('unbalanced sexp');
			}
		}

		ret.offset = idx - ret.offset + 1; //+1 for the )

		return ret;
	}
};
var atom = {
	not : TruthMap([
		TK.SEPARATOR,
		TK.NEWLINE,
		TK.BEGIN_SEXP,
		TK.END_SEXP,
		TK.COMMENT
	]),
	tokenize : function (src, idx) {
		var ret = {
			type   : 'atom',
			value  : '',
			offset : idx
		};

		//TODO: add useful shit
		//this does not scale at all
		while (src[idx] && !this.not[src[idx]]) {
			ret.value += src[idx];
			idx += 1;
		}

		ret.offset = idx - ret.offset;

		return ret;
	}
};

var whitespaceOffset = function (src, idx) {
	var i = idx;

	while (/\s/.test(src[i])) {
		i += 1;
	}

	return i - idx;
};

var lineOffset = function (src, idx) {
	var i = idx;

	while (/[^\n]/.test(src[i])) {
		i += 1;
	}

	return i - idx + 1; //+1 for the \n
};

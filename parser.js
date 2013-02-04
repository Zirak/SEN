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

var TK = {
	BEGIN_SEXP : '(',
	END_SEXP   : ')',
	DICT_KEY   : ':',
	SEPARATOR  : ' ',
	ZALGO      : '̳̲͎̟͚̰͈͂̾̋͌ͩ̅̎́Z̸̲͕̺̼͗̋̀́A͔̒͂ͬ̃̋ͭ͛̚L͉̹̟̙̆ͯ̓̀̅̄͗ͬ̕G͒̔ͣ̾ͮͭ̇͊͏̴͚͇̟̬̤̖̞̕ͅỎ̵̲̮͎͕͎͙̤̾̂̈́ͣ̂́!̛̺̙͎͕̹̍͛ͧ̇͋̃͑'
};

var tokenize = function (str, idx) {
	if (!str[idx]) {
		return '';
	}

	if (str[idx] === TK.BEGIN_SEXP) {
		return sexp.tokenize(str, idx);
	}
	return atom.tokenize(str, idx);
}

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
			child = tokenize(src, idx);

			ret.value.push(child);
			idx += child.offset;
			idx += whitespaceOffset(src, idx);

			if (!src[idx]) {
				throw new SyntaxError('Unbalanced sexp');
			}
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
		while (src[idx] !== TK.END_SEXP) {
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

			idx += value.offset
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
	tokenize : function (src, idx) {
		var ret = {
			type   : 'atom',
			value  : '',
			offset : idx
		};

		//TODO: add useful shit
		while (
			src[idx] &&
				src[idx] !== TK.SEPARATOR &&
				src[idx] !== TK.BEGIN_SEXP &&
				src[idx] !== TK.END_SEXP
		) {
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

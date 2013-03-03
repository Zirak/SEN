if (typeof SEN === 'undefined' ) {
	SEN = {};
}

(function () {
"use strict";

var lineSep = '',
	indentChar = '',

	indent = '';

//returns the SEN representation of val
function str (val) {
	var prevIndent, res;

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

		prevIndent = indent;
		indent += indentChar;

		if (Array.isArray(val)) {
			res = stringArray(val);
		}
		else {
			res = stringObject(val);
		}
		indent = prevIndent;

		return res;

	default:
		throw new SyntaxError('aint nobody got encoding fo dat');
	}

	function stringArray (arr) {
		if (!arr.length) {
			return TK.BEGIN_SEXP + TK.END_SEXP;
		}

		return (
			TK.BEGIN_SEXP +
			arr.map(str).join(TK.SEPARATOR + lineSep + indent) +
			TK.END_SEXP );
	}

	function stringObject (obj) {
		var keys = Object.keys(obj);

		if (!keys.length) {
			return TK.BEGIN_SEXP + TK.END_SEXP;
		}

		return (
			TK.BEGIN_SEXP +
			keys
				.map(stringPair.bind(null, obj))
				.join(TK.SEPARATOR + lineSep + indent ) +
			TK.END_SEXP );
	}

	function stringPair (obj, key) {
		return (
			TK.SYMBOL_KEY + str(key) +
			TK.SEPARATOR + str(obj[key]) );
	}
}

SEN.stringify = function (obj, replacer, spaces) {
	if (spaces) {
		lineSep = '\n';
		indentChar = ' ';
	}
	else {
		lineSep = '';
		indentChar = '';
	}
	indent = '';

	return str(obj);
};

})();

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

function TruthMap (props) {
	return props.reduce(assignTrue, {});

	function assignTrue (ret, prop) {
		ret[prop] = true;
		return ret;
	}
}

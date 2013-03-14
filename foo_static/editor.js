var cont = document.container,
	sen = cont.sen,
	js = cont.js;

cont.sen.onkeyup = throttle(senToJs, 1000);
cont.js.onkeyup = throttle(jsToSen, 1000);

cont.tojs.onclick = senToJs;
cont.tosen.onclick = jsToSen;

function senToJs () {
	try {
		js.value = JSON.stringify(SEN.parse(sen.value), null, 4);
	}
	catch (e) {
		js.value = e.toString();
		throw e;
	}
}
function jsToSen () {
	try {
		sen.value = SEN.stringify(JSON.parse(js.value), null, true);
	}
	catch (e) {
		sen.value = e.toString();
		throw e;
	}
}

function throttle (fun, time) {
	var timeout = -1;

	var ret = function () {
		clearTimeout(timeout);

		var context = this, args = arguments;
		timeout = setTimeout(function () {
			fun.apply(context, args);
		}, time);
	};

	return ret;
}

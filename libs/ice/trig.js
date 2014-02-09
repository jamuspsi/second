
Trig = {};
_.each(['sin', 'cos', 'tan', 'sec', 'csc', 'cot'], function(i){
	Trig[i] = Math[i];
	Trig[i + 'd'] = function(deg) {
		var rads = deg * Math.PI /  180.0;
		return Math[i](rads);
	};
});

console.log("Setting trig's pi");
Trig.pi = Trig.Pi = Trig.PI = Math.PI;
Trig.twopi = 2 * Trig.pi;

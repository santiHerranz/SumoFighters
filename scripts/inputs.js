

var KEY = {
	K1: 49,
	K2: 50,
	K3: 51,
	K4: 52,
	K5: 53,
	K6: 54,
	K7: 55,
	K8: 56,
	K9: 57,
	K0: 48,
	D: 68,
	W: 87,
	A: 65,
	S: 83,
	RIGHT: 39,
	UP: 38,
	LEFT: 37,
	DOWN: 40,
	SHIFT_OUT: 14,
	SHIFT_IN: 15,
	SHIFT: 16,
	Q: 81,
	ESPACE: 32,
	ENTER: 13
};

var input = {
	right: false,
	up: false,
	left: false,
	down: false,
	espace: false,
	enter: false,
	shift: false,
	K1: false,
	K2: false,
	K3: false,
	K4: false,
	K5: false,
	K6: false,
	K7: false,
	K8: false,
	K9: false,
	K0: false,
	quit: false
};

function onkeydown(evt) {
	var code = evt.keyCode;

	//console.log(code);

	if (code == KEY.RIGHT || code == KEY.D)
		input.right = true;
	if (code == KEY.UP || code == KEY.W)
		input.up = true;
	if (code == KEY.LEFT || code == KEY.A)
		input.left = true;
	if (code == KEY.DOWN || code == KEY.S)
		input.down = true;

	if (code == KEY.ESPACE)
		input.espace = true;
	if (code == KEY.ENTER)
		input.enter = true;
	if (code == KEY.SHIFT)
		input.shift = true;
	if (code == KEY.Q)
		input.quit = true;


		if (code == KEY.K1) input.K1 = true;
		if (code == KEY.K2) input.K2 = true;
		if (code == KEY.K3) input.K3 = true;
		if (code == KEY.K4) input.K4 = true;
		if (code == KEY.K5) input.K5 = true;
		if (code == KEY.K6) input.K6 = true;
		if (code == KEY.K7) input.K7 = true;
		if (code == KEY.K8) input.K8 = true;
		if (code == KEY.K9) input.K9 = true;
		if (code == KEY.K0) input.K0 = true;

}

function onkeyup(evt) {
	var code = evt.keyCode;

	//console.log(code);

	if (code == KEY.RIGHT || code == KEY.D)
		input.right = false;
	if (code == KEY.UP || code == KEY.W)
		input.up = false;
	if (code == KEY.LEFT || code == KEY.A)
		input.left = false;
	if (code == KEY.DOWN || code == KEY.S)
		input.down = false;

	if (code == KEY.ESPACE)
		input.espace = false;
		if (code == KEY.ENTER)
		input.enter = false;
	if (code == KEY.SHIFT)
		input.shift = false;

		if (code == KEY.K1) input.K1 = false;
		if (code == KEY.K2) input.K2 = false;
		if (code == KEY.K3) input.K3 = false;
		if (code == KEY.K4) input.K4 = false;
		if (code == KEY.K5) input.K5 = false;
		if (code == KEY.K6) input.K6 = false;
		if (code == KEY.K7) input.K7 = false;
		if (code == KEY.K8) input.K8 = false;
		if (code == KEY.K9) input.K9 = false;
		if (code == KEY.K0) input.K0 = false;		

}

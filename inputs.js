

var KEY = {
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
	shoot: false,
	quit: false
};
var input_B = {
	right: false,
	up: false,
	left: false,
	down: false,
	espace: false,
	shoot: false,
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

}


var canvas,
ctx,
width,
height;

// mouse event variables
var mousePosition = { x: 0, y: 0 }
var mouseLeftPressed = false;

var deltaTime = 0.12;
var showRays = false;
var showTrails = true;

var playSounds = true;
var playCollisionSound = true;
var showBoundaries = false;
var showCameraView = false;

let score_A = 0;
let score_B = 0;

var menuGame, modalMenuGame, modalEl, scoreAEl, scoreBEl;
var strategyAFuncText, strategyBFuncText;
var statusAText, statusBText;

var hitSoundTime = 0;
var trailTime = 0;


modalEl = document.getElementById('modalEl');
scoreAEl = document.getElementById('scoreAEl');
scoreBEl = document.getElementById('scoreBEl');
scoreBigEl = document.getElementById('scoreBigEl');
strategyAFuncText = document.getElementById('strategyAFuncText');
strategyBFuncText = document.getElementById('strategyBFuncText');
statusAText = document.getElementById('statusAText');
statusBText = document.getElementById('statusBText');
menuGame = document.getElementById('menuGame');
modalMenuGame = document.getElementById("my-modal");


var game = new Game();

function prepare() {


	// canvas
	canvas = document.getElementById('canvas');
	width = window.innerWidth;
	height = window.innerHeight;
	canvas.width = width;
	canvas.height = height;
	ctx = canvas.getContext('2d');

	game.prepare();

	if (game.player_B)
		game.status = GAME_STATUS.GAME_MENU;
	else 
		gameMenuStart(GAME_MODE.CPUvsCPU);

}

function gamePauseHandler() {
	if (game.status != GAME_STATUS.GAME_PAUSED) {
		gamePauseBtn.innerHTML = "Continue";
		game.status = GAME_STATUS.GAME_PAUSED;
	} else {
		game.status = GAME_STATUS.GAME_RUNNING;
		gamePauseBtn.innerHTML = "Pause";
	}

}

function gameMenuBack() {
	game.mode = GAME_MODE.NONE;
	modalEl.style.display = 'none';
	menuGame.style.display = 'flex';
	modalMenuGame.style.display = 'flex';
	game.status = GAME_STATUS.GAME_MENU;
}

function gameMenuStart(mode) {

	game.mode = mode;
	init();

	menuGame.style.display = 'none';
	modalMenuGame.style.display = 'none';
	game.status = GAME_STATUS.GAME_RUNNING;
}

function init() {

	game.init();

	modalEl.style.display = 'none';
	yukoScoreA.style.display = 'none';
	yukoScoreB.style.display = 'none';

}



function step() {

	game.step();

	if (game.mode == GAME_MODE.NONE)
		return;

	if (game.status == GAME_STATUS.GAME_MENU) {}

	if (game.status == GAME_STATUS.GAME_GOAL) {

		if (input.espace || input.enter)
			gameBtn.click();

	}

	if (game.status == GAME_STATUS.GAME_RUNNING) {


		if (game.player_Dummy) {
			if (game.collide(game.player_A, game.player_Dummy) ) {

				while ( game.checkDojoLimits(game.player_Dummy, game.dojo)) {
					game.player_Dummy.pos.x = Math.random()*width;
					game.player_Dummy.pos.y = Math.random()*height;
				}
			}
		}


		if (game.player_A)
			strategyAFuncText.innerHTML = JSON.stringify(game.player_A.strategyFunc.toString().replace(/\n\n/g, "\n").replace(/\n/g, "&#13;").replace(/\r/g, "").replace(/\t/g, "  ")); // .split(/\/\*\n|\n\*\//g).slice(1,-1).join()
		if (game.player_B)
			strategyBFuncText.innerHTML = JSON.stringify(game.player_B.strategyFunc.toString().replace(/\n\n/g, "\n").replace(/\n/g, "&#13;").replace(/\r/g, "").replace(/\t/g, "  ")); // .split(/\/\*\n|\n\*\//g).slice(1,-1).join()

		if (game.player_A)
			statusAText.innerHTML = JSON.stringify(game.player_A.getInfo(), null, 2);
		if (game.player_B)
			statusBText.innerHTML = JSON.stringify(game.player_B.getInfo(), null, 2);

		if (game.players.length > 1 && !game.player_Dummy) {

			if (game.player_B) {
				if (game.checkDojoLimits(game.player_B, game.dojo)) {
					score_A += 1;
					scoreGoal("A");
				}
			}

			if (game.checkDojoLimits(game.player_A, game.dojo)) {
				score_B += 1;
				scoreGoal("B");
			}

			if (game.player_A.energy <= 0 && game.player_B.energy <= 0) {
				scoreGoal("TIE");
			}

		} else {
			if (game.player_A.energy <= 0) {
				scoreGoal("TIE");
			}
		}

	}

}

function draw() {

	// clean canvas
	ctx.fillStyle = 'rgb(80,80,80, 0.9)';
	ctx.fillRect(0, 0, width, height);
	ctx.globalAlpha = 0.9;

	game.draw();

	// CAMERA VIEW
	if (showCameraView) {
		var imgSize = 200;
		var imgData = ctx.getImageData(player_A.pos.x - imgSize * 1 / 10, player_A.pos.y - imgSize * 1 / 2, imgSize, imgSize);
		ctx.putImageData(imgData, 10, 70);
	}

	scoreAEl.innerHTML = score_A;
	scoreBEl.innerHTML = score_B;
}

function scoreGoal(yuko) {

	game.status = GAME_STATUS.GAME_GOAL;

	scoreABigEl.innerHTML = score_A;
	scoreBBigEl.innerHTML = score_B;

	if (yuko == "A") {
		yukoScoreA.style.display = 'flex';
		playSound("YUKO-A");
	} else if (yuko == "B") {
		yukoScoreB.style.display = 'flex';
		playSound("YUKO-B");
	} else {
		playSound("TIE");
	}

	gameBtn.innerHTML = 'Next round';
	modalEl.style.display = 'flex';

	if (game.status == GAME_STATUS.GAME_GOAL && game.mode == GAME_MODE.CPUvsCPU) {
		setTimeout(() => {
			gameBtn.click();
		}, 1500);
	}
}

// Element Event Listeners

gameBtn.addEventListener('click', () => {
	init();

	setTimeout(() => {
		game.status = GAME_STATUS.GAME_RUNNING;
	}, 200);

});

menuBackBtn.addEventListener('click', () => {
	gameMenuBack();
});

gamePauseBtn.addEventListener('click', () => {
	gamePauseHandler();
});

btnCPUvsCPU.addEventListener('click', () => {
	gameMenuStart(GAME_MODE.CPUvsCPU);
});
btnPlayervsCPU.addEventListener('click', () => {
	gameMenuStart(GAME_MODE.PLAYERvsCPU);
});

// Event Listeners

addEventListener('keydown', onkeydown);
addEventListener('keyup', onkeyup);
addEventListener('resize', prepare);

addEventListener('mousedown', (event) => {
	mousePosition = { x: event.clientX, y: event.clientY }
	game.mouseDownEvent(mousePosition);
});

addEventListener('mousemove', (event) => {
	mousePosition = { x: event.clientX, y: event.clientY }
	game.mouseMoveEvent(mousePosition);
});

addEventListener('mouseup', (event) => {
	mousePosition = { x: event.clientX, y: event.clientY }
	game.mouseUpEvent(mousePosition);
});

addEventListener('contextmenu', function (event) {
	event.preventDefault();
	event.stopPropagation();
	return false;
});

var handleScroll = function (event) {

	return event.preventDefault() && false;
};
addEventListener('DOMMouseScroll', handleScroll, false);
addEventListener('mousewheel', handleScroll, false);



function loop() {
	requestAnimationFrame(loop);
	step();
	draw();
}

prepare();
init();
loop();

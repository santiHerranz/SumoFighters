
var canvas,
ctx,
width,
height;

var deltaTime = 0.12;
var showRays = false;
var showBoundaries = false;
var showCameraView = false;

let score = 0;
let score_A = 0;
let score_B = 0;

const GAME_TIME_SECONDS = 60;

var modalEl, scoreEl;

var tatami;
var players = [];
var player_A;
var player_B;

const IMPULSO_X = 3;
const IMPULSO_Y = 3;

var clicked = false;

let walls = [];

const GAME_STATUS = {
	GAME_INIT: 0,
	GAME_READY: 1,
	GAME_RUNNING: 10,
	GAME_GOAL: 20,
	GAME_TIMEOVER: 90,
	ROUND_OVER: 100
};

const BOUNDARY_TYPE = {
	WALL: 1,
	PLAYER: 2,
	TATAMI: 3
};

let gameStatus = GAME_STATUS.GAME_INIT;

function prepare() {

	// start & score
	modalEl = document.getElementById('modalEl');
	scoreEl = document.getElementById('scoreEl');
	scoreBigEl = document.getElementById('scoreBigEl');

	// canvas
	canvas = document.getElementById('canvas');
	width = window.innerWidth;
	height = window.innerHeight;
	canvas.width = width;
	canvas.height = height;
	ctx = canvas.getContext('2d');

	let offset = -width;
	walls.push(new Boundary(0 + offset, offset, width - offset, offset, BOUNDARY_TYPE.WALL)); // top
	walls.push(new Boundary(0 + offset, height - offset, width - offset, height - offset, BOUNDARY_TYPE.WALL)); // bottom
	walls.push(new Boundary(offset, offset, offset, height - offset, BOUNDARY_TYPE.WALL)); // left
	walls.push(new Boundary(width - offset, offset, width - offset, height - offset, BOUNDARY_TYPE.WALL)); // left


	// tatami
	tatami = new Tatami(width / 2, height / 2, 400);
	tatami.bgcolor = "rgb(0,0,0,1)";

	let playerSize = 40;

	// player A
	player_A = new Player(width * 5 / 12, height / 2, playerSize);
	player_A.color = "rgb(0,0,255,0.99)";
	player_A.bgcolor = "rgb(0,0,255,0.8)";

	// player B
	player_B = new Player(width * 7 / 12, height / 2, playerSize);
	player_B.color = "rgb(255,0,0,0.99)";
	player_B.bgcolor = "rgb(255,0,0,0.8)";

	player_A.walls.forEach(wall => {
		walls.push(wall);
	});
	player_B.walls.forEach(wall => {
		walls.push(wall);
	});

	players.push(player_A);
	players.push(player_B);

	// set game time
	gameTime = 60 * GAME_TIME_SECONDS; // 60 FPS * 60 seg = 1 minute
	gameStatus = GAME_STATUS.GAME_READY;
}

function init() {

	//
	score = 0;

	// Initial position
	player_A.pos.x = width * 5 / 12;
	player_A.pos.y = height / 2;
	player_A.heading = Math.random() * 2 * Math.PI; // convert to radians

	player_B.pos.x = width * 7 / 12;
	player_B.pos.y = height / 2;
	player_B.heading = 180 + Math.random() * 2 * Math.PI; // convert to radians

	// Initial energy
	player_A.energy = player_B.energy = 100;

	modalEl.style.display = 'none';
	yukonA.style.display = 'none';
	yukonB.style.display = 'none';

	this.strategy = [];
	this.strategy.push({
		name: "ATTACK",
		deltaSpeed: 8 + (Math.random() - 0.5),
		deltaTurn: .8
	});

	this.strategy.push({
		name: "DEFEND",
		deltaSpeed: 2 + (Math.random() - 0.5),
		deltaTurn: .4
	});

	this.strategyIndex = (Math.random() - 0.5) > 0 ? 1 : 0;

	setTimeout(() => {
		gameStatus = GAME_STATUS.GAME_RUNNING;
	}, 200);

}

function animate() {
	requestAnimationFrame(animate);
	step();
	draw();
}

function rgbToHex(rgb) {
	return '#' + ((rgb[0] << 16) | (rgb[1] << 8) | rgb[2]).toString(16);
};

function step() {

	if (gameStatus == GAME_STATUS.GAME_RUNNING) {

		player_A.scan(walls)
		player_B.scan(walls)

		let strategyIndexA = this.strategyIndex;
		drive(player_A, this.strategy[strategyIndexA]);

		let strategyIndexB = (this.strategyIndex + 1) % this.strategy.length;
		drive(player_B, this.strategy[strategyIndexB]);

		let speed = 2;

		if (input.left && input.shift) {
			player_A.sideMove(-1 * speed);
		} else if (input.left) {
			player_A.rotate(-0.05 * speed);
		}
		if (input.right && input.shift) { //
			player_A.sideMove(1 * speed);
		} else if (input.right) {
			player_A.rotate(0.05 * speed);
		}
		if (input.up) {
			player_A.move(1 * speed);
		} else if (input.down) {
			player_A.move(-1 * speed);
		}

		// impulse player B
		player_B.rot = 0;
		if (input_B.left)
			player_B.rot -= 0.15;
		if (input_B.right)
			player_B.rot += 0.15;

		player_B.thrusting = input_B.up;
		player_B.reverse = input_B.down;

		// contact
		if (player_A.collide(player_B)) {

			var dx = player_B.pos.x - player_A.pos.x,
			dy = player_B.pos.y - player_A.pos.y,
			dist = Math.sqrt(dx * dx + dy * dy),
			minDist = player_A.radius + player_B.radius;

			var tx = player_A.pos.x + dx / dist * minDist,
			ty = player_A.pos.y + dy / dist * minDist,
			ax = (tx - player_B.pos.x),
			ay = (ty - player_B.pos.y);

			const K = 0.9;

			player_A.pos.x -= ax * K;
			player_A.pos.y -= ay * K;
			player_B.pos.x += ax * K;
			player_B.pos.y += ay * K;

		}

		player_A.step();
		player_B.step();

		if (checkTatamiLimits(player_B, tatami)) {
			score_A += 1;
			scoreGoal("A");
		}
		if (checkTatamiLimits(player_A, tatami)) {
			score_B += 1;
			scoreGoal("B");
		}

		if (player_A.energy <= 0 && player_B.energy <= 0) {
			scoreGoal("TIE");
		}

	}

}

function drive(player, strategy = {
		name: "",
		deltaSpeed: 1 + (Math.random() - 0.5) * 2,
		deltaTurn: .12
	}) {

	player.name = strategy.name;

	let d = BuildDrive(player, strategy.deltaSpeed, strategy.deltaTurn);

	// Apply
	player.move(d.speed);
	player.rotate(d.turn);
}

// build a drive controller
function BuildDrive(player, deltaSpeed, deltaTurn) {
	let autoSpeed = 0;
	let autoTurn = 0;

	for (let ray of player.vision) {
		if (ray.point != null) {
			if (ray.distance < tatami.radius * 2) {

				autoSpeed += deltaSpeed;

				let mitad = player.vision.length / 2;
				let giro = Math.abs(mitad - ray.index);

				if (ray.index < mitad)
					autoTurn += -Math.PI / 180 * giro * deltaTurn;

				if (ray.index > mitad)
					autoTurn += Math.PI / 180 * giro * deltaTurn;

			}
		} else {
			autoSpeed -= 5;
		}
	}

	let maxSpeed = 100;
	if (autoSpeed > maxSpeed)
		autoSpeed = maxSpeed;

	if (autoSpeed == 0 && autoTurn == 0)
		autoTurn = Math.PI / 180 * 10;

	return {
		speed: autoSpeed,
		turn: autoTurn
	};
}

function draw() {

	ctx.fillStyle = 'rgb(80,80,80, 0.9)';
	ctx.fillRect(0, 0, width, height);

	/* Tatami de Robot sumo o sumobot de madera de 115 cm de diámetro
	y 7 cm de borde lateral blanco para
	competiciones de luchas de robots de cualquier tipo */

	tatami.draw();

	walls.forEach(wall => wall.show());

	player_A.draw()
	player_B.draw()

	// CAMERA VIEW
	if (showCameraView) {
		var imgSize = 200;
		var imgData = ctx.getImageData(player_A.pos.x - imgSize * 1 / 10, player_A.pos.y - imgSize * 1 / 2, imgSize, imgSize);
		ctx.putImageData(imgData, 10, 70);
	}

	scoreEl.innerHTML = score_A + ' - ' + score_B;
}

function checkTatamiLimits(player, tatami) {
	return !tatami.collide(player);
}

function scoreGoal(yuko) {

	gameStatus = GAME_STATUS.GAME_GOAL;

	scoreABigEl.innerHTML = score_A;
	scoreBBigEl.innerHTML = score_B;

	if (yuko == "A") {
		yukonA.style.display = 'flex';
		playSound("YUKO-A");
	} else if (yuko == "B") {
		yukonB.style.display = 'flex';
		playSound("YUKO-B");
	} else {
		playSound("TIE");
	}

	gameBtn.innerHTML = 'Next round';
	modalEl.style.display = 'flex';

	setTimeout(() => {
		gameBtn.click();
	}, 1500);
}

gameBtn.addEventListener('click', () => {

	init();

});

addEventListener('keydown', onkeydown);
addEventListener('keyup', onkeyup);

addEventListener('resize', prepare);

addEventListener('mousedown', (event) => {

	players.forEach((target) => {

		var distance = Math.hypot(target.x - event.clientX, target.y - event.clientY);

		if (distance < target.radius) {
			target.clicked = true;
		}

	});
});

addEventListener('mousemove', (event) => {
	players.forEach((target) => {
		if (gameStatus == GAME_STATUS.GAME_RUNNING && target.clicked) {
			target.pos.x = event.clientX;
			target.pos.y = event.clientY;
		}
	});
});

addEventListener('mouseup', (event) => {
	players.forEach((target) => {
		target.clicked = false;
	});
});

prepare();
init();
animate();

function playSound(sound, p = 0) {

	switch (sound) {

	case "YUKO-A":
		zzfx(...[1.01, 0, 1395, , .08, .22, , 1.19, , , -579, .06, , , , , , .57, .01, .12]); // Pickup 126
		break;
	case "YUKO-B":
		zzfx(...[1.01, .15, 146.8324, , .08, .22, , 1.19, , , -579, .06, , , , , , .57, .01, .12]); // Pickup 126
		break;

	case "TIE":
		zzfx(...[1.01, 0, 187, , , .23, 2, 3.6, 2.3, , 200, .09, , , , , , .9, .03, .03]); // Hit 78
		//zzfx(...[2.29, , 1460, , .08, .13, 1, .52, .2, , , , .06, , -2, -0.2, .01, .62, .07, .1]); // Pickup 55 - Mutation 6
		break;

	default:
		break;
	}

}

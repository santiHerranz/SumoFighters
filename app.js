
var canvas,
ctx,
width,
height;

let score = 0;
let score_A = 0;
let score_B = 0;

const GAME_TIME_SECONDS = 60;

var modalEl, scoreEl;

var tatami;
var player_A;
var player_B;
var players = [];

var map;

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
	GAME_OVER: 100
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

	let offset = width / 100;
	walls.push(new Boundary(0 + offset, offset, width - offset, offset)); // top
	walls.push(new Boundary(0 + offset, height - offset, width - offset, height - offset)); // bottom
	walls.push(new Boundary(offset, offset, offset, height - offset)); // left
	walls.push(new Boundary(width - offset, offset, width - offset, height - offset)); // left


	// tatami
	tatami = new Tatami(width / 2, height / 2);
	tatami.radius = 225;
	tatami.bgcolor = "rgb(0,0,0,1)";

	// player A
	player_A = new Player(width * 5 / 12, height / 2);
	player_A.bgcolor = "rgb(0,0,255,0.9)";

	// player B
	player_B = new Player(width * 7 / 12, height / 2);
	player_B.bgcolor = "rgb(255,0,0,0.9)";

	player_A.walls.forEach(wall => {
		walls.push(wall);
	});	
	player_B.walls.forEach(wall => {
		walls.push(wall);
	});

	players.push(player_A);
	players.push(player_B);

	map = new Map();
	map.set('player_A', player_A.pos.x);
	map.set('player_B', player_B.pos.x);

	setInitPosition();

	// set game time
	gameTime = 60 * GAME_TIME_SECONDS; // 60 FPS * 60 seg = 1 minute
	gameStatus = GAME_STATUS.GAME_READY;
}

function setInitPosition() {

	player_A.pos.x = width * 5 / 12;
	player_A.pos.y = height / 2;
	player_A.heading = Math.random() * 2*Math.PI; // convert to radians

	player_B.pos.x = width * 7 / 12;
	player_B.pos.y = height / 2;
	player_B.heading = 180 + Math.random() * 2*Math.PI; // convert to radians


}

function init() {
	score = 0;

	setInitPosition();

	modalEl.style.display = 'none';

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

		//if (gameTime--<= 0) gameOver();

		player_A.scan(walls)
		player_B.scan(walls)

		drive(player_A);
		drive(player_B);


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

		// update map
		map.set('player_A', {
			x: player_A.x,
			y: player_A.y
		});
		map.set('player_B', {
			x: player_B.x,
			y: player_B.y
		});

		/*
		distance to limit
		angle to limit

		distance to target
		angle to target
		velocity of target
		target orientation

		strategy:
		- avoid fall over limit keeping at center
		- push other player to the limit

		 */

		player_A.step();
		player_B.step();

		if (checkTatamiLimits(player_A,tatami)) {
			score_B += 1;
			scoreGoal();
		}
		if (checkTatamiLimits(player_B,tatami)) {
			score_A += 1;
			scoreGoal();
		}

	}

}

function drive(player) {
	let autoSpeed = 0;
	let autoRot = 0;


	for (let ray of player.vision) {
		if (ray.point != null) {
			if (ray.distance < 400  ) {

				autoSpeed += 1+(Math.random()-0.5)*0.2;

				let mitad = player.vision.length/2;
				let giro = Math.abs( mitad - ray.index);

				if ( ray.index < mitad ) 
					autoRot += -Math.PI/180*giro*.1;


				if (ray.index > mitad)
					autoRot += Math.PI/180*giro*.1;

			}
		}
	}


	if ( autoSpeed == 0 &&  autoRot == 0)
		autoRot = Math.PI/180*10;


	// let goForward = false;

	// let countForward = 0;
	// for (let ray of player.vision) {
	// 	if (ray.point != null) {
	// 		if (ray.distance < 300 )
	// 		countForward++;
	// 	}
	// }

	// if (countForward > 2) {
	// 	autoSpeed += 10;

	// }
	// else if (countForward > 1) {
	// 	autoSpeed += 5;
	// 	autoRot = Math.PI/180*1;
	// }
	// else if (countForward > 0) {
	// 	autoRot = Math.PI/180*3;
	// 	autoSpeed += 1;
	// }
	// else
	// 	autoRot = Math.PI/180*5;




	player.move(autoSpeed);
	player.rotate(autoRot);
}

function draw() {

	ctx.fillStyle = 'rgb(0,50,0, 0.9)';
	ctx.fillRect(0, 0, width, height);

	/* Tatami de Robot sumo o sumobot de madera de 115 cm de diámetro
	y 7 cm de borde lateral blanco para
	competiciones de luchas de robots de cualquier tipo */

	tatami.draw();

	walls.forEach(wall => wall.show());

	player_A.draw()
	player_B.draw()

	var imgSize = 200;
	var imgData = ctx.getImageData(player_A.pos.x - imgSize * 1 / 10, player_A.pos.y - imgSize * 1 / 2, imgSize, imgSize);
	ctx.putImageData(imgData, 10, 70);

	scoreEl.innerHTML = score_A + ' - ' + score_B;
}

function checkTatamiLimits(player, tatami) {
	return !tatami.collide(player);
}

function scoreGoal() {
	gameStatus = GAME_STATUS.GAME_GOAL;
	gameBtn.innerHTML = 'Continue game';
	scoreBigEl.innerHTML = score_A + ' - ' + score_B;
	modalEl.style.display = 'flex';

	setTimeout(() => {
		gameBtn.click();
	}, 1000);
}

function gameOver() {
	gameStatus = GAME_STATUS.GAME_OVER;
	scoreBigEl.innerHTML = score_A + ' - ' + score_B;
	modalEl.style.display = 'flex';
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

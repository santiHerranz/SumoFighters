
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

var dojo;
var players = [];
var player_A;
var player_B;
var player_Dummy;

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
	ALL: 0,
	WALL: 1,
	PLAYER: 2,
	DOJO: 3
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
	dojo = new Dojo(width / 2, height / 2, 400);
	dojo.bgcolor = "rgb(0,0,0,1)";
	dojo.walls.forEach(wall => {
		walls.push(wall);
	});

	let playerSize = 40;


	// player_Dummy = new Player(width /2, height / 2, playerSize);
	// player_Dummy.strategyFunc = remoteControlDrive;
	// players.push(player_Dummy);
	

	// player A
	player_A = new Player(width /2 - 100, height / 2, playerSize);
	player_A.strategyFunc = ramdonDrive;
	player_A.color = "rgb(0,0,255,0.99)";
	player_A.bgcolor = "rgb(0,0,255,0.8)";
	player_A.walls.forEach(wall => {
		walls.push(wall);
	});
	players.push(player_A);

	if (true) {
		//player B
		player_B = new Player(width/2+100, height / 2, playerSize);
		player_B.strategyFunc = ramdonDrive;
		player_B.color = "rgb(255,0,0,0.99)";
		player_B.bgcolor = "rgb(255,0,0,0.8)";
		player_B.walls.forEach(wall => {
			walls.push(wall);
		});
		players.push(player_B);

	}
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
	// Initial energy
	player_A.energy = 100;

	if (player_B) {
		player_B.pos.x = width * 7 / 12;
		player_B.pos.y = height / 2;
		player_B.heading = 180 + Math.random() * 2 * Math.PI; // convert to radians

		// Initial energy
		player_B.energy = 100;

	}

	modalEl.style.display = 'none';
	yukonA.style.display = 'none';
	yukonB.style.display = 'none';

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

		players.forEach(player => {
			//player.scan(walls, BOUNDARY_TYPE.ALL, player.vision )
			player.scan(walls, BOUNDARY_TYPE.PLAYER, player.visionPlayersLayer)
			player.scan(walls, BOUNDARY_TYPE.DOJO, player.visionDojoLayer)

		});

		players.forEach(player => {
			//drive(player, avoidOutRingBackwarsDrive);
			drive(player, player.strategyFunc);
		});

		// contact

		let i = players.length;
		while( i-- ) {
			let dot = players[ i ];
			var j = i;
			if( j > 0 ) {
				while( j-- ) {
					collideAndPush(dot,players[ j ] );
				}
			}
		}

		// if (players.length > 1) {
		// 	collideAndPush(player_A, player_B);
		// 	collideAndPush(player_A, player_Dummy);
		// 	collideAndPush(player_B, player_Dummy);
		// }

		players.forEach(player => {
			player.step();
		});

		if (players.length > 1) {
			if (checkTatamiLimits(player_B, dojo)) {
				score_A += 1;
				scoreGoal("A");
			}
			if (checkTatamiLimits(player_A, dojo)) {
				score_B += 1;
				scoreGoal("B");
			}

			if (player_A.energy <= 0 && player_B.energy <= 0) {
				scoreGoal("TIE");
			}

		} else {
			if (player_A.energy <= 0) {
				scoreGoal("TIE");
			}
		}

	}

}

function collideAndPush(one, other) {

	var dx = other.pos.x - one.pos.x,
	dy = other.pos.y - one.pos.y,
	dist = Math.sqrt(dx * dx + dy * dy),
	minDist = one.radius + other.radius;

	if (dist < minDist) {
		var tx = one.pos.x + dx / dist * minDist,
		ty = one.pos.y + dy / dist * minDist,
		ax = (tx - other.pos.x),
		ay = (ty - other.pos.y);
	
		const K = 0.9;
	
		one.pos.x -= ax * K;
		one.pos.y -= ay * K;
		other.pos.x += ax * K;
		other.pos.y += ay * K;
	
	}

}

function drive(player, func) {

	let d = func(player);

	// Apply
	player.move(d.speed);
	player.rotate(d.turn);
}

function draw() {

	// clean canvas
	ctx.fillStyle = 'rgb(80,80,80, 0.9)';
	ctx.fillRect(0, 0, width, height);
	ctx.globalAlpha = 0.9;

	dojo.draw();

	walls.forEach(wall => wall.show());

	players.forEach(player => {
		player.draw();
	});

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

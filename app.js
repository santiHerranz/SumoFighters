
var canvas,
ctx,
width,
height;

var deltaTime = 0.12;
var showRays = false;
var showTrails = true;

var playSounds = true;
var playCollisionSound = true;
var showBoundaries = false;
var showCameraView = false;

let score_A = 0;
let score_B = 0;

const GAME_TIME_SECONDS = 60;

var menuGame, modalMenuGame, modalEl, scoreAEl, scoreBEl;
var strategyAFuncText, strategyBFuncText;
var statusAText, statusBText;

var hitSoundTime = 0;
var trailTime = 0;

const GAME_MODE = {
	NONE: 0,
	PLAYERvsCPU: 1,
	CPUvsCPU: 2
}
var gameMode = GAME_MODE.NONE;

var dojo;
var players = [];
var player_A;
var player_B;
var player_Dummy;

// Some juice
var particles = [];
var trails = [];

const IMPULSO_X = 3;
const IMPULSO_Y = 3;

var clicked = false;

let walls = [];

const GAME_STATUS = {
	GAME_INIT: 0,
	GAME_READY: 1,
	GAME_MENU: 5,
	GAME_PAUSED: 8,
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

const VISION_LAYER = {
	DOJO: 1,
	PLAYER: 2,
};

let gameStatus = GAME_STATUS.GAME_INIT;

function prepare() {

	// start & score
	menuGame = document.getElementById('menuGame');
	modalMenuGame = document.getElementById("my-modal");

	modalEl = document.getElementById('modalEl');
	scoreAEl = document.getElementById('scoreAEl');
	scoreBEl = document.getElementById('scoreBEl');
	scoreBigEl = document.getElementById('scoreBigEl');
	strategyAFuncText = document.getElementById('strategyAFuncText');
	strategyBFuncText = document.getElementById('strategyBFuncText');
	statusAText = document.getElementById('statusAText');
	statusBText = document.getElementById('statusBText');

	// canvas
	canvas = document.getElementById('canvas');
	width = window.innerWidth;
	height = window.innerHeight;
	canvas.width = width;
	canvas.height = height;
	ctx = canvas.getContext('2d');

	// Empty
	players = [];
	walls = [];

	let offset = -width;
	walls.push(new Boundary(0 + offset, offset, width - offset, offset, BOUNDARY_TYPE.WALL)); // top
	walls.push(new Boundary(0 + offset, height - offset, width - offset, height - offset, BOUNDARY_TYPE.WALL)); // bottom
	walls.push(new Boundary(offset, offset, offset, height - offset, BOUNDARY_TYPE.WALL)); // left
	walls.push(new Boundary(width - offset, offset, width - offset, height - offset, BOUNDARY_TYPE.WALL)); // left


	// Create Dojo
	dojo = new Dojo(width / 2, height / 2, 400);
	dojo.bgcolor = "rgb(0,0,0,1)";
	dojo.walls.forEach(wall => {
		walls.push(wall);
	});

	let playerSize = 40;

	// player A
	player_A = new Player(width / 2 - 100, height / 2, playerSize);
	player_A.strategyFunc = Strategy.randomDrive;
	player_A.color = "rgb(0,0,255,0.99)";
	player_A.bgcolor = "rgb(0,0,255,0.8)";
	player_A.walls.forEach(wall => {
		walls.push(wall);
	});
	players.push(player_A);

	if (true) {
		//player B
		player_B = new Player(width / 2 + 100, height / 2, playerSize);
		player_B.strategyFunc = Strategy.randomDrive;
		player_B.color = "rgb(255,0,0,0.99)";
		player_B.bgcolor = "rgb(255,0,0,0.8)";
		player_B.walls.forEach(wall => {
			walls.push(wall);
		});
		players.push(player_B);

	}

	if (false) {
		// Dummy player for test
		player_Dummy = new Player(width / 2, height / 2, playerSize);
		player_Dummy.strategyFunc = Strategy.IdleDrive;
		// No visible for others
		// player_Dummy.walls.forEach(wall => {
		// 	walls.push(wall);
		// });
		players.push(player_Dummy);
	}

	// set game time
	gameTime = 60 * GAME_TIME_SECONDS; // 60 FPS * 60 seg = 1 minute
	gameStatus = GAME_STATUS.GAME_MENU;
}

function gamePauseHandler() {
	if (gameStatus != GAME_STATUS.GAME_PAUSED) {
		gamePauseBtn.innerHTML = "Continue";
		gameStatus = GAME_STATUS.GAME_PAUSED;
	} else {
		gameStatus = GAME_STATUS.GAME_RUNNING;
		gamePauseBtn.innerHTML = "Pause";
	}

}

function gameMenuBack() {
	gameMode = GAME_MODE.NONE;
	modalEl.style.display = 'none';
	menuGame.style.display = 'flex';
	modalMenuGame.style.display = 'flex';
	gameStatus = GAME_STATUS.GAME_MENU;
}

function gameMenuStart(mode) {

	gameMode = mode;
	init();

	menuGame.style.display = 'none';
	modalMenuGame.style.display = 'none';
	gameStatus = GAME_STATUS.GAME_RUNNING;
}

function init() {

	// clear trails
	trails = [];

	// Initial position
	player_A.pos.x = width * 5 / 12;
	player_A.pos.y = height / 2;
	player_A.heading = Math.random() * Math.PI; // convert to radians
	player_A.strategyFunc = Strategy.randomDrive;
	if (gameMode == GAME_MODE.PLAYERvsCPU) {
		player_A.strategyFunc = Strategy.remoteFacing;
	}
	// Initial energy
	player_A.energy = 100;
	player_A.memory = null;

	if (player_B) {
		player_B.pos.x = width * 7 / 12;
		player_B.pos.y = height / 2;
		player_B.heading = 180 + Math.random() * Math.PI; // convert to radians
		player_B.strategyFunc = Strategy.randomDrive;

		// Initial energy
		player_B.energy = 100;
		player_B.memory = null;
	}

	if (player_Dummy) {
		player_Dummy.pos.x = width / 2;
		player_Dummy.pos.y = height * 1 / 3;
		player_Dummy.heading = 90; // convert to radians
		// Initial energy
		player_Dummy.energy = 100;
		player_Dummy.memory = null;
	}

	modalEl.style.display = 'none';
	yukoScoreA.style.display = 'none';
	yukoScoreB.style.display = 'none';

}

function loop() {
	requestAnimationFrame(loop);
	step();
	draw();
}

function step() {

	// remove death stuff
	particles = particles.filter(particle => {
		return particle.health > 0
	});
	trails = trails.filter(trail => {
		return trail.health > 0
	});

	if (gameMode == GAME_MODE.NONE)
		return;

	if (gameStatus == GAME_STATUS.GAME_MENU) {}

	if (gameStatus == GAME_STATUS.GAME_GOAL) {

		if (input.espace || input.enter)
			gameBtn.click();

	}

	if (gameStatus == GAME_STATUS.GAME_RUNNING) {

		players.forEach(player => {
			player.scan(walls, BOUNDARY_TYPE.PLAYER, player.visionLayer[VISION_LAYER.PLAYER])
			player.scan(walls, BOUNDARY_TYPE.DOJO, player.visionLayer[VISION_LAYER.DOJO])

		});

		strategyAFuncText.innerHTML = JSON.stringify(player_A.strategyFunc.toString().replace(/\n\n/g, "\n").replace(/\n/g, "&#13;").replace(/\r/g, "").replace(/\t/g, "  ")); // .split(/\/\*\n|\n\*\//g).slice(1,-1).join()
		strategyBFuncText.innerHTML = JSON.stringify(player_B.strategyFunc.toString().replace(/\n\n/g, "\n").replace(/\n/g, "&#13;").replace(/\r/g, "").replace(/\t/g, "  ")); // .split(/\/\*\n|\n\*\//g).slice(1,-1).join()

		statusAText.innerHTML = JSON.stringify(player_A.getInfo(), null, 2);
		statusBText.innerHTML = JSON.stringify(player_B.getInfo(), null, 2);

		// Trails
		if (trailTime > 0.1 / deltaTime) {
			players.forEach(player => {
				trails.push(new Trail(player.pos.x, player.pos.y, player.color));
			});
			trailTime = 0;
		} else
			trailTime += 1;

		players.forEach(player => {
			//drive(player, avoidOutRingBackwarsDrive);
			drive(player, player.strategyFunc);
		});

		// Avoid same boring strategy
		if (players[0].name == "DEFEND" && players[1].name == "DEFEND")
			init();
		if (players[0].name == "EVADE" && players[1].name == "EVADE")
			init();

		// contact
		players.forEach(player => {
			player.inContact = false;
		});
		let i = players.length;
		while (i--) {
			let dot = players[i];
			var j = i;
			if (j > 0) {
				while (j--) {
					collideAndPush(dot, players[j]);
				}
			}
		}

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

		particles.forEach(particle => particle.step());
		trails.forEach(trail => trail.step());

	}

}

function collideAndPush(one, other) {

	var dx = other.pos.x - one.pos.x,
	dy = other.pos.y - one.pos.y,
	dist = Math.sqrt(dx * dx + dy * dy),
	minDist = one.radius + other.radius;

	if (dist < minDist) {
		one.inContact = true;
		other.inContact = true;

		// Agressive collission
		// update hit sound
		let speed = one.speed.mag() / deltaTime + other.speed.mag() / deltaTime;
		if (speed > 10) {

			hitSoundTime += speed;
			if (hitSoundTime > 50 / deltaTime) {

				// point of collission
				let point = one.pos.copy().add(Vector.fromAngle(other.pos.copy().sub(one.pos).heading(), other.radius));
				for (let index = 0; index < 4; index++) {
					particles.push(new Particle(point.x, point.y));
				}

				hitSoundTime = 0;
				playSound("HIT");

			}
		} else
			hitSoundTime = .5;

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

	trails.forEach(trail => trail.draw());

	players.forEach(player => {
		player.draw();
	});

	particles.forEach(particle => particle.draw());

	// CAMERA VIEW
	if (showCameraView) {
		var imgSize = 200;
		var imgData = ctx.getImageData(player_A.pos.x - imgSize * 1 / 10, player_A.pos.y - imgSize * 1 / 2, imgSize, imgSize);
		ctx.putImageData(imgData, 10, 70);
	}

	scoreAEl.innerHTML = score_A;
	scoreBEl.innerHTML = score_B;
}

function checkTatamiLimits(player, tatami) {
	return !tatami.collide(player);
}

function scoreGoal(yuko) {

	gameStatus = GAME_STATUS.GAME_GOAL;

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

	if (gameStatus == GAME_STATUS.GAME_GOAL && gameMode == GAME_MODE.CPUvsCPU) {
		setTimeout(() => {
			gameBtn.click();
		}, 1500);
	}
}

gameBtn.addEventListener('click', () => {
	init();

	setTimeout(() => {
		gameStatus = GAME_STATUS.GAME_RUNNING;
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
loop();

function playSound(sound, p = 0) {

	if (!playSounds)
		return;

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

	case "HIT":
		if (!playCollisionSound)
			return;
		// zzfx([.5,,1e3,.02,,.2,1,3,.1,,,,,1,-30,.5,,.5]);
		//zzfx([,,90,,.01,.03,4,,,,,,,9,50,.2,,.2,.01]);
		//zzfx(...[.3,.1,70,,,.01,4,,,,-9,.1,,,,,,.5]			);

		//zzfx(...[.5,,1e3,.02,,.2,1,3,.1,,,,,1,-30,.5,,.5]);
		//zzfx(...[1.8,,461,,,.29,4,.1,.6,,,,,.3,.1,.5,.02,.52,.03]); // Hit 147

		//zzfx(...[,0,391.9954]); // Sound Default
		//zzfx(...[2.79,,181,,,0,2,.88,,,495,,,,,,.18,.1]); // Random 6
		//zzfx(...[2,50,181,,,0,2,.88,,,495,,,,,,.18,.1]); // Random 6
		//zzfx(...[2,1,181,.01,,0,,.88,,,495,,,,,,.18,.1]); // Random 6
		//zzfx(...[2,.5,181,.01,,0,,.88,,,495,,,,,,.18,.1]); // Random 6
		//zzfx(...[2,-0.05,181,.01,,0,,.88,,,495,,,,,,.18,.1,.01]); // Random 6
		//zzfx(...[2, -0.05, 65.40639, .01, , 0, , 0, , , , , , , , , .18, 0, .01]); // Random 6
		//zzfx(...[,-0.05,65.40639,.01,,0,,0,,,,,,,,,.18,0,.01]); // Random 6
		break;

	default:
		break;
	}

}



function IdleDrive(player, strategy = {
	name: "IDLE"
}) {
player.name = strategy.name;

return {
	speed: 0,
	turn: 0
};
}

function ramdonDrive(player, strategy = {
		name: "RAMDON"
	}) {
	player.name = strategy.name;

	//player.strategyFunc = avoidOutRingDrive;
	//player.strategyFunc = forwardBackwardDrive;
	//player.strategyFunc = attackDrive;
	//player.strategyFunc = defendDrive;

	if (Math.random() - 0.5 > 0) {
		player.strategyFunc = attackDrive;
	} else {
		player.strategyFunc = defendDrive;
	}

	return {
		speed: 0,
		turn: 0
	};
}


function remoteFacing(player, strategy = {
	name: "COMPOUND"
}) {
player.name = strategy.name;

let d = {
	speed: 0,
	turn: 0
};

let remote =  remoteControlDrive(player);
let face = faceDrive(player);

d.speed += remote.speed;
d.turn += remote.turn;

d.speed += face.speed*0.1;
d.turn += face.turn*0.1;

return {
	speed: d.speed,
	turn: d.turn
};
}




function faceDrive(player, strategy = {
	name: "FACE",
	deltaTurn:5
}) {
player.name = strategy.name;


let autoSpeed = 0;
let autoTurn = 0;

let playerLayer = player.visionPlayersLayer;

for (let ray of playerLayer) {
	if (ray.point != null) {
		if (ray.distance < dojo.radius * 2) {


			let mitad = playerLayer.length / 2;
			let giro = Math.abs(mitad - ray.index);

			if (ray.index < mitad)
				autoTurn += -Math.PI / 180 * giro * strategy.deltaTurn;

			if (ray.index > mitad)
				autoTurn += Math.PI / 180 * giro * strategy.deltaTurn;

		}
	}
}


if (autoSpeed == 0 && autoTurn == 0)
	autoTurn = Math.PI / 180 * 10;

return {
	speed: autoSpeed,
	turn: autoTurn
};
}






function remoteControlDrive(player, strategy = {
	name: "REMOTE"
}) {
player.name = strategy.name;


let speed = 50;
let turnSpeed = 20;

if (input.left && input.shift) {
	player.sideMove(-1 * speed);
} else if (input.left) {
	player.rotate(-0.05 * turnSpeed);
}
if (input.right && input.shift) { //
	player.sideMove(1 * speed);
} else if (input.right) {
	player.rotate(0.05 * turnSpeed);
}
if (input.up) {
	player.move(1 * speed);
} else if (input.down) {
	player.move(-1 * speed);
}
if (input.up && input.shift) {
	player.move(1 * speed*2);
} else if (input.down && input.shift) {
	player.move(-1 * speed*2);
}



return {
	speed: 0,
	turn: 0
};
}


// build a drive controller
function forwardBackwardDrive(player, strategy = {
		name: "FOR-BACK",
		defaultSpeed: 50,
		minDistanceMoved: 100,
		distanceToLimit: 100
	}) {
	player.name = strategy.name;

	// strategic data to be stored in memory
	let memory = {
		distance: 0,
		dir: 1,
		changeCounts: 0
	};

	// read memory data from player
	if (player.memory != null)
		memory = JSON.parse(JSON.stringify(player.memory));

	if (memory.changeCounts > 3) {
		player.strategy = avoidOutRingDrive;
	}

	// get actual speed
	let autoSpeed = player.speed.mag() / deltaTime;
	let autoTurn = 0;

	if (Math.abs(player.distance - memory.distance) > strategy.minDistanceMoved) {
		for (let ray of player.vision) {
			if (ray.point != null) {
				if (ray.distance < strategy.distanceToLimit) {

					// checkpoint to mesure distance
					memory.distance = player.distance;
					// change direction
					memory.dir *= -1;

					memory.changeCounts++;
					break;
				}
			}
		}
	}

	if (!autoSpeed) {
		autoSpeed = strategy.defaultSpeed;
	}

	autoSpeed = memory.dir * autoSpeed;

	player.memory = memory;

	return {
		speed: autoSpeed,
		turn: autoTurn
	};
}

function avoidOutRingDrive(player, strategy = {
		name: "IN RING",
		deltaSpeed: 8 + (Math.random() - 0.5),
		deltaTurn: 30
	}) {

	player.name = strategy.name;

	let autoSpeed = 30;
	let autoTurn = 0;

	let dojoBoundaries = player.visionDojoLayer;

	for (let ray of dojoBoundaries) {
		if (ray.point != null) {
			if (ray.distance < dojo.radius* 1/ 5) {

				let mitad = dojoBoundaries.length / 2;
				let giro = Math.abs(mitad - ray.index);

				if (ray.index < mitad)
					autoTurn += -Math.PI / 180 * giro * strategy.deltaTurn;

				if (ray.index > mitad)
					autoTurn += Math.PI / 180 * giro * strategy.deltaTurn;

			}
		}
	}

	if (autoSpeed == 0 && autoTurn == 0)
		autoTurn = Math.PI / 180 * 10;

	return {
		speed: autoSpeed,
		turn: autoTurn
	};
}


function avoidOutRingBackwarsDrive(player, strategy = {
	name: "IN RING",
	deltaSpeed: 8 + (Math.random() - 0.5),
	deltaTurn: -0.2
}) {

player.name = strategy.name;

let autoSpeed = -30;
let autoTurn = 0.2;

let dojoBoundaries = player.visionDojoLayer;
for (let ray of dojoBoundaries) {
	if (ray.point != null) {
		if (ray.distance < dojo.radius* 1/ 5) {

			let mitad = dojoBoundaries.length / 2;
			let giro = Math.abs(mitad - ray.index);

			if (ray.index < mitad)
				autoTurn += -Math.PI / 180 * giro * strategy.deltaTurn;

			if (ray.index > mitad)
				autoTurn += Math.PI / 180 * giro * strategy.deltaTurn;

		}
	}
}

if (autoSpeed == 0 && autoTurn == 0)
	autoTurn = Math.PI / 180 * 10;

return {
	speed: autoSpeed,
	turn: autoTurn
};
}

// build a drive controller
function attackDrive(player, strategy = {
		name: "ATTACK",
		deltaSpeed: 8 + (Math.random() - 0.5),
		deltaTurn: .8
	}) {

	player.name = strategy.name;

	let autoSpeed = 0;
	let autoTurn = 0;

	let playerLayer = player.visionPlayersLayer;

	for (let ray of playerLayer) {
		if (ray.point != null) {
			if (ray.distance < dojo.radius * 2) {

				autoSpeed += strategy.deltaSpeed;

				let mitad = playerLayer.length / 2;
				let giro = Math.abs(mitad - ray.index);

				if (ray.index < mitad)
					autoTurn += -Math.PI / 180 * giro * strategy.deltaTurn;

				if (ray.index > mitad)
					autoTurn += Math.PI / 180 * giro * strategy.deltaTurn;

			}
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

function defendDrive(player, strategy = {
		name: "DEFEND",
		deltaSpeed: 2 + (Math.random() - 0.5),
		deltaTurn: .4
	}) {

	player.name = strategy.name;

	let autoSpeed = 0;
	let autoTurn = 0;

	let playerLayer = player.visionPlayersLayer;

	for (let ray of playerLayer) {
		if (ray.point != null) {
			if (ray.distance < dojo.radius * 2) {

				autoSpeed += strategy.deltaSpeed;

				let mitad = playerLayer.length / 2;
				let giro = Math.abs(mitad - ray.index);

				if (ray.index < mitad)
					autoTurn += -Math.PI / 180 * giro * strategy.deltaTurn;

				if (ray.index > mitad)
					autoTurn += Math.PI / 180 * giro * strategy.deltaTurn;

			}
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

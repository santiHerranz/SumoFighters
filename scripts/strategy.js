
class Strategy {

	static IdleDrive(player, strategy = {
			name: "IDLE"
		}) {
		player.name = strategy.name;

		return {
			speed: 0,
			turn: 0
		};
	}

	static waitDrive(player, strategy = {
			name: "WAIT",
			waitSeconds: 1
		}) {

		// strategic data to be stored in memory
		let memory = {
			startTime: 0
		};

		// read memory data from player
		if (player.memory != null)
			memory = JSON.parse(JSON.stringify(player.memory));

		if (memory.startTime == 0)
			memory.startTime = new Date();

		let endTime = new Date();
		let startTime = Date.parse(memory.startTime);
		var timeDiff = endTime - startTime; //in ms

		// strip the ms
		timeDiff /= 1000;

		// get seconds
		var seconds = Math.round(timeDiff);
		if (seconds > strategy.waitSeconds)
			player.strategyFunc = Strategy.randomDrive;

		player.memory = memory;

		player.name = strategy.name;

		return {
			speed: 0,
			turn: 0
		};
	}

	static randomDrive(player, strategy = {
			name: "RAMDON"
		}) {

		let options = [
			// Strategy.squareDrive,
			//Strategy. triangle100Drive,
			//  Strategy.triangle300Drive,

			// Strategy.IdleDrive,
			Strategy.evadeDrive,
			Strategy.seekDrive,
			Strategy.attackDrive,
			Strategy.defendDrive,
			Strategy.attack2Drive,
			Strategy.keepInsideDrive,
			// Strategy.sidemovesDrive,
				]; //


		let index = Math.floor(Math.random() * options.length);
		player.strategyFunc = options[index];

		player.name = strategy.name;
		return {
			speed: 0,
			turn: 0
		};
	}

	static triangle100Drive(player) {

		let square = Strategy.polygonDrive(player, {
			name: "TRI100",
			defaultSpeed: 50,
			minDistanceMoved: 100,
			angle: 120
		});

		return {
			speed: square.speed,
			turn: square.turn
		};
	}

	static triangle300Drive(player) {

		let square = Strategy.polygonDrive(player, {
			name: "TRI300",
			defaultSpeed: 100,
			minDistanceMoved: 300,
			angle: 120
		});

		return {
			speed: square.speed,
			turn: square.turn
		};
	}

	static squareDrive(player) {

		let square = Strategy.polygonDrive(player, {
			name: "SQUARE",
			defaultSpeed: 150,
			minDistanceMoved: 300,
			angle: 90
		});

		return {
			speed: square.speed,
			turn: square.turn
		};
	}

	static polygonDrive(player, strategy) {

		// strategic data to be stored in memory
		let memory = {
			distance: 0,
			dir: 1
		};

		// read memory data from player
		if (player.memory != null)
			memory = JSON.parse(JSON.stringify(player.memory));

		// get actual speed
		let autoSpeed = player.speed.mag() / deltaTime;
		let autoTurn = 0;

		if (Math.abs(player.distance - memory.distance) > strategy.minDistanceMoved) {
			// checkpoint to mesure distance
			memory.distance = player.distance;
			autoTurn = strategy.angle;
		}

		if (!autoSpeed) {
			autoSpeed = strategy.defaultSpeed;
		}

		autoSpeed = memory.dir * autoSpeed;

		player.memory = memory;

		player.name = strategy.name;

		return {
			speed: autoSpeed,
			turn: autoTurn
		};
	}

	static remoteFacing(player, strategy = {
			name: "REMOTE FACE"
		}) {

		let d = {
			speed: 0,
			turn: 0
		};

		let remote = Strategy.remoteControlDrive(player);
		let face = Strategy.faceDrive(player);

		d.speed += remote.speed;
		d.turn += remote.turn;

		d.speed += face.speed * 0.1;
		d.turn += face.turn * 0.1;

		player.name = strategy.name;
		return {
			speed: d.speed,
			turn: d.turn
		};
	}

	static faceDrive(player, strategy = {
			name: "FACE",
			deltaTurn: 5
		}) {

		let autoSpeed = 0;
		let autoTurn = 0;

		let playerLayer = player.visionLayer[VISION_LAYER.PLAYER];

		for (let ray of playerLayer) {
			if (ray.point != null) {
				if (ray.distance < Infinity) {

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
			autoTurn = Math.PI / 180 * 45;

		player.name = strategy.name;

		return {
			speed: autoSpeed,
			turn: autoTurn
		};
	}


	static remoteControlDrive(player, strategy = {
			name: "REMOTE"
		}) {

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
			player.move(1 * speed * 2);
		} else if (input.down && input.shift) {
			player.move(-1 * speed * 2);
		}

		player.name = strategy.name;

		return {
			speed: 0,
			turn: 0
		};
	}

	// build a drive controller
	static forwardBackwardDrive(player, strategy = {
			name: "FOR-BACK",
			defaultSpeed: 50,
			minDistanceMoved: 100,
			distanceToLimit: 100
		}) {

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

		let dojoLayer = player.visionLayer[VISION_LAYER.DOJO];

		if (Math.abs(player.distance - memory.distance) > strategy.minDistanceMoved) {
			for (let ray of dojoLayer) {
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

		player.name = strategy.name;

		return {
			speed: autoSpeed,
			turn: autoTurn
		};
	}

	static avoidOutRingDrive(player, strategy = {
			name: "IN RING",
			deltaSpeed: 8 + (Math.random() - 0.5),
			deltaTurn: 30
		}) {

		let autoSpeed = 30;
		let autoTurn = 0;

		let dojoLayer = player.visionLayer[VISION_LAYER.DOJO];

		for (let ray of dojoLayer) {
			if (ray.point != null) {
				if (ray.distance < game.dojo.radius * 1 / 5) {

					let mitad = dojoLayer.length / 2;
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

		player.name = strategy.name;
		return {
			speed: autoSpeed,
			turn: autoTurn
		};
	}






}

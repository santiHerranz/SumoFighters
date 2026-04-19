
class Strategy {

	static getMemory(player, defaults) {
		if (player.memory == null) {
			return {
				...defaults
			};
		}
		return {
			...defaults,
			...player.memory
		};
	}

	static getStrategyOptions() {
		if (Strategy._strategyOptions == null) {
			Strategy._strategyOptions = [
				Strategy.evadeDrive,
				Strategy.seekDrive,
				Strategy.attackDrive,
				Strategy.defendDrive,
				Strategy.attack2Drive,
				Strategy.keepInsideDrive,
			];
		}
		return Strategy._strategyOptions;
	}

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

		// Strategic data stored in player memory.
		const memory = Strategy.getMemory(player, {
			startTime: 0
		});

		if (memory.startTime == 0) {
			memory.startTime = Date.now();
		}

		const seconds = Math.round((Date.now() - memory.startTime) / 1000);
		if (seconds > strategy.waitSeconds) {
			player.strategyFunc = Strategy.randomDrive;
		}

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

		const options = Strategy.getStrategyOptions();
		const index = Math.floor(Math.random() * options.length);
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

		// Strategic data stored in player memory.
		const memory = Strategy.getMemory(player, {
			distance: 0,
			dir: 1
		});

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

		const playerLayer = player.visionLayer[VISION_LAYER.PLAYER];
		const middle = playerLayer.length / 2;
		const turnMultiplier = (Math.PI / 180) * strategy.deltaTurn;

		for (let ray of playerLayer) {
			if (ray.point == null || ray.distance === Infinity) {
				continue;
			}
			const turnDelta = Math.abs(middle - ray.index) * turnMultiplier;
			if (ray.index < middle) {
				autoTurn -= turnDelta;
			} else if (ray.index > middle) {
				autoTurn += turnDelta;
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

		// Strategic data stored in player memory.
		const memory = Strategy.getMemory(player, {
			distance: 0,
			dir: 1,
			changeCounts: 0
		});

		if (memory.changeCounts > 3) {
			player.strategy = avoidOutRingDrive;
		}

		// get actual speed
		let autoSpeed = player.speed.mag() / deltaTime;
		let autoTurn = 0;

		const dojoLayer = player.visionLayer[VISION_LAYER.DOJO];

		if (Math.abs(player.distance - memory.distance) > strategy.minDistanceMoved) {
			for (let ray of dojoLayer) {
				if (ray.point != null && ray.distance < strategy.distanceToLimit) {
					// checkpoint to mesure distance
					memory.distance = player.distance;
					// change direction
					memory.dir *= -1;

					memory.changeCounts++;
					break;
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

		const dojoLayer = player.visionLayer[VISION_LAYER.DOJO];
		const middle = dojoLayer.length / 2;
		const ringLimit = game.dojo.radius / 5;
		const turnMultiplier = (Math.PI / 180) * strategy.deltaTurn;

		for (let ray of dojoLayer) {
			if (ray.point == null || ray.distance >= ringLimit) {
				continue;
			}
			const turnDelta = Math.abs(middle - ray.index) * turnMultiplier;
			if (ray.index < middle) {
				autoTurn -= turnDelta;
			} else if (ray.index > middle) {
				autoTurn += turnDelta;
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

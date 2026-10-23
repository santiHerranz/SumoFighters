
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

	static getFsmStateMap() {
		if (Strategy._fsmStateMap == null) {
			Strategy._fsmStateMap = {
				SEEK: Strategy.seekDrive,
				ATTACK: Strategy.attackDrive,
				DEFEND: Strategy.defendDrive,
				EVADE: Strategy.evadeDrive,
				KEEP_INSIDE: Strategy.keepInsideDrive,
				SIDEMOVES: Strategy.sidemovesDrive,
				ATTACK2: Strategy.attack2Drive,
				AVOID_OUT_RING: Strategy.avoidOutRingDrive,
			};
		}
		return Strategy._fsmStateMap;
	}

	static getFsmConfig(player, configOverrides = {}) {
		const defaults = {
			minTicksInState: 18,
			noProgressDistance: 0.25,
			noProgressTicksThreshold: 180,
			criticalBorderRadiusFactor: 1.8,
			nearBorderDojoFactor: 0.45,
			nearBorderSideRadiusFactor: 2.5,
			frontStrongRadiusFactor: 3.0,
			frontStrongMinHits: 2,
			highEnergyThreshold: 70,
			lowEnergyThreshold: 30,
			contactAttackEnergyThreshold: 35
		};
		let runtimeConfig = {};
		if (typeof fsmTuningConfigs !== "undefined" && fsmTuningConfigs != null) {
			const slot = player && player.slot ? player.slot : "A";
			runtimeConfig = fsmTuningConfigs[slot] || {};
		}
		return {
			...defaults,
			...runtimeConfig,
			...configOverrides
		};
	}

	static getFsmSignals(player, config) {
		const playerLayer = player.visionLayer[VISION_LAYER.PLAYER] || [];
		const dojoLayer = player.visionLayer[VISION_LAYER.DOJO] || [];
		const dojoRadius = game && game.dojo ? game.dojo.radius : 400;

		const playerMiddle = Math.floor(playerLayer.length / 2);
		const dojoMiddle = Math.floor(dojoLayer.length / 2);
		const leftIndex = 0;
		const rightIndex = Math.max(dojoLayer.length - 1, 0);

		const enemyFrontDistance = playerLayer[playerMiddle] ? playerLayer[playerMiddle].distance : Infinity;
		const distBorderFront = dojoLayer[dojoMiddle] ? dojoLayer[dojoMiddle].distance : Infinity;
		const distBorderLeft = dojoLayer[leftIndex] ? dojoLayer[leftIndex].distance : Infinity;
		const distBorderRight = dojoLayer[rightIndex] ? dojoLayer[rightIndex].distance : Infinity;
		const distBorderSideMin = Math.min(distBorderLeft, distBorderRight);

		let enemyVisibleCount = 0;
		let enemyFrontHits = 0;
		for (let i = 0; i < playerLayer.length; i++) {
			const ray = playerLayer[i];
			if (ray.point == null || ray.distance === Infinity) {
				continue;
			}
			enemyVisibleCount++;
			if (Math.abs(i - playerMiddle) <= 2) {
				enemyFrontHits++;
			}
		}

		const enemyVisible = enemyVisibleCount > 0;
		const enemyFrontStrong = enemyFrontDistance < player.radius * config.frontStrongRadiusFactor || enemyFrontHits >= config.frontStrongMinHits;
		const highEnergy = player.energy >= config.highEnergyThreshold;
		const lowEnergy = player.energy <= config.lowEnergyThreshold;
		const criticalBorder = distBorderFront < player.radius * config.criticalBorderRadiusFactor;
		const nearBorder = distBorderFront < dojoRadius * config.nearBorderDojoFactor || distBorderSideMin < player.radius * config.nearBorderSideRadiusFactor;

		return {
			enemyVisible,
			enemyVisibleCount,
			enemyFrontStrong,
			enemyFrontDistance,
			inContact: player.inContact,
			energy: player.energy,
			highEnergy,
			lowEnergy,
			distBorderFront,
			distBorderSideMin,
			criticalBorder,
			nearBorder,
		};
	}

	static resolveFsmState(player, signals, config) {
		const fsm = player.fsm;

		// 1) Border safety has maximum priority.
		if (signals.criticalBorder) {
			return {
				state: "AVOID_OUT_RING",
				reason: "BORDER_CRITICAL",
				emergency: true
			};
		}
		if (signals.nearBorder) {
			return {
				state: "KEEP_INSIDE",
				reason: "BORDER_NEAR",
				emergency: true
			};
		}

		// 2) Active collision with enemy in front.
		if (signals.inContact && signals.enemyFrontStrong) {
			return {
				state: signals.energy >= config.contactAttackEnergyThreshold ? "ATTACK" : "DEFEND",
				reason: "CONTACT_FRONT",
				emergency: false
			};
		}

		// 3) Energy-driven tactical choice while target is visible.
		if (signals.enemyVisible && signals.highEnergy) {
			return {
				state: signals.enemyFrontStrong ? "ATTACK" : "SEEK",
				reason: "ENERGY_ADVANTAGE",
				emergency: false
			};
		}
		if (signals.enemyVisible && !signals.lowEnergy) {
			return {
				state: "DEFEND",
				reason: "ENERGY_MEDIUM",
				emergency: false
			};
		}
		if (signals.enemyVisible && signals.lowEnergy) {
			return {
				state: "EVADE",
				reason: "ENERGY_LOW",
				emergency: false
			};
		}

		// 4) No target: seek or side movement.
		if (!signals.enemyVisible) {
			if (fsm.noProgressTicks > config.noProgressTicksThreshold) {
				return {
					state: "ATTACK2",
					reason: "NO_PROGRESS_TIMEOUT",
					emergency: false
				};
			}
			if (signals.distBorderSideMin < player.radius * 3) {
				return {
					state: "SIDEMOVES",
					reason: "SEARCH_SIDE_SPACE",
					emergency: false
				};
			}
			return {
				state: "SEEK",
				reason: "SEARCH_TARGET",
				emergency: false
			};
		}

		return {
			state: "SEEK",
			reason: "DEFAULT",
			emergency: false
		};
	}

	static applyStateMachine(player, config = {}) {
		if (!player.fsm || !player.fsm.enabled) {
			return;
		}

		const fsmConfig = Strategy.getFsmConfig(player, config);
		const fsm = player.fsm;
		const movedDistance = player.distance - fsm.lastDistance;
		if (movedDistance < fsmConfig.noProgressDistance) {
			fsm.noProgressTicks++;
		} else {
			fsm.noProgressTicks = 0;
		}
		fsm.lastDistance = player.distance;

		const signals = Strategy.getFsmSignals(player, fsmConfig);
		fsm.lastSignals = {
			enemyVisible: signals.enemyVisible,
			enemyFrontStrong: signals.enemyFrontStrong,
			inContact: signals.inContact,
			energy: Math.round(signals.energy),
			distBorderFront: Number.isFinite(signals.distBorderFront) ? Math.round(signals.distBorderFront) : Infinity,
			distBorderSideMin: Number.isFinite(signals.distBorderSideMin) ? Math.round(signals.distBorderSideMin) : Infinity,
			noProgressTicks: fsm.noProgressTicks,
			config: {
				minTicksInState: fsmConfig.minTicksInState,
				noProgressDistance: fsmConfig.noProgressDistance,
				noProgressTicksThreshold: fsmConfig.noProgressTicksThreshold
			}
		};
		const decision = Strategy.resolveFsmState(player, signals, fsmConfig);

		if (fsm.currentState == null) {
			fsm.currentState = decision.state;
			fsm.lastReason = decision.reason;
			fsm.ticksInState = 0;
		} else if (fsm.currentState !== decision.state) {
			const canSwitch = decision.emergency || fsm.ticksInState >= fsmConfig.minTicksInState;
			if (canSwitch) {
				fsm.currentState = decision.state;
				fsm.lastReason = decision.reason;
				fsm.ticksInState = 0;
			} else {
				fsm.ticksInState++;
			}
		} else {
			fsm.lastReason = decision.reason;
			fsm.ticksInState++;
		}

		const stateMap = Strategy.getFsmStateMap();
		player.strategyFunc = stateMap[fsm.currentState] || Strategy.seekDrive;
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

	// ---- Helpers for the perception-based tactics (strategy-search.js, -charge.js, ...) ----

	// Tuning shared by the tactics. The adaptive brain's game plan overrides some
	// of them (see GAME_PLANS in brain.js); manual hotkeys use these defaults.
	static getTacticParams(player) {
		const defaults = {
			approachSpeed: 120, // cruising speed towards the opponent
			pushSpeed: 260,     // speed into a frontal contact
			finishSpeed: 340,   // all-in push when the opponent is at the edge
			dodgeSpeed: 260,    // side step speed (matador, escape)
			dodgeTrigger: 150,  // opponent distance that triggers the side step
			holdRadius: 70,     // centre zone where HOLD CENTER stops moving
			resistSpeed: 140,   // push back when shoved while holding
			edgeSafety: 30,     // px kept before the ring-out distance
			patience: 300,      // passive ticks tolerated before forcing the fight (brain)
			pace: 1,            // how fast the battery may be spent over the round (brain)
		};
		const plan = player.brain && player.brain.plan;
		return plan ? { ...defaults, ...plan.params } : defaults;
	}

	// Per-tactic memory namespaced inside player.memory, so tactics do not step
	// on each other's keys. The brain clears a namespace when it enters the tactic.
	static getTacticMemory(player, key, defaults) {
		if (player.memory == null) player.memory = {};
		if (player.memory[key] == null) player.memory[key] = { ...defaults };
		return player.memory[key];
	}

	// Turn command that closes `gain` of the bearing error in one tick.
	static steer(bearing, gain = 0.7) {
		return bearing * gain / deltaTime;
	}

	// Holonomic move towards a relative bearing (forward + side move together),
	// so the robot can travel one way while still facing the opponent.
	static translate(bearing, speed) {
		return {
			speed: speed * Math.cos(bearing),
			sideSpeed: speed * Math.sin(bearing)
		};
	}

	// Ring governor: never travel past `safety` px before the ring-out distance in
	// the direction of motion. Pushing an opponent is still allowed, because it is
	// ahead of us and leaves the ring first.
	static limitToRing(player, d, safety) {
		const s = player.perception && player.perception.self;
		if (!s || !s.localized) return d;
		const room = edge => Math.max(0, edge - safety) / deltaTime;
		if (d.speed > 0) d.speed = Math.min(d.speed, room(s.edgeAhead));
		else if (d.speed < 0) d.speed = -Math.min(-d.speed, room(s.edgeBehind));
		if (d.sideSpeed > 0) d.sideSpeed = Math.min(d.sideSpeed, room(s.edgeRight));
		else if (d.sideSpeed < 0) d.sideSpeed = -Math.min(-d.sideSpeed, room(s.edgeLeft));
		return d;
	}

	// Shove escalation for frontal contacts. The pushing pair drifts at half the
	// speed difference, so pushing harder also costs less energy per pixel won:
	// when the shove stalls raise the speed step by step, relax once it moves.
	// Going all in (capped well below the speed at which the bodies would tunnel)
	// only pays when we are ahead on energy or the opponent is near the edge;
	// otherwise a war of attrition just drains both robots.
	static pushSpeed(player, base) {
		const p = player.perception;
		const c = p.contact;
		const memory = Strategy.getTacticMemory(player, "push", { speed: base });
		const allIn = player.energy - p.enemy.energyEst > 5 || p.enemy.edgeMargin < 120;
		const cap = Math.max(base, allIn ? 520 : base * 1.25);
		if (!c.front) {
			memory.speed = base;
		} else if (c.advance < 1.5) {
			memory.speed = Math.min(memory.speed + 20, cap);
		} else if (c.advance > 4) {
			memory.speed = Math.max(base, memory.speed - 10);
		}
		return Math.min(memory.speed, cap);
	}

	// Where to look: the opponent if visible, else the contact or the predicted bearing.
	static lookBearing(p) {
		if (p.enemy.visible) return p.enemy.bearing;
		if (p.contact.active) return p.contact.bearing;
		return p.enemy.predictedBearing;
	}

}

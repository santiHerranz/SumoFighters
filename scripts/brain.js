// Adaptive brain. Every tick it scores each tactic with a utility function over
// the perception model (edge danger, opponent near the edge, energy balance,
// who is winning the shoves, opponent aggression, time left...), weights the
// scores with the round's game plan and runs the best tactic, with a little
// hysteresis so it does not flicker.
// Between rounds a discounted UCB1 bandit picks the game plan that has been
// beating this opponent, and the opponent profile it saw seeds the next round.
//
// brainType "classic" keeps the original priority FSM (strategy.js) as it was.

const TACTICS = {
	SEARCH: { drive: "searchDrive", memoryKey: "search" },
	HOLD: { drive: "holdCenterDrive", memoryKey: null },
	CHARGE: { drive: "chargeDrive", memoryKey: null },
	FINISH: { drive: "finishDrive", memoryKey: null },
	FLANK: { drive: "flankDrive", memoryKey: "flank" },
	MATADOR: { drive: "matadorDrive", memoryKey: "matador" },
	ESCAPE: { drive: "escapeDrive", memoryKey: null },
};

// Game plans (personalities): utility weights per tactic (1 when missing) and
// tactic parameters overriding Strategy.getTacticParams(). `patience` is how
// many passive ticks the plan tolerates before it forces the engagement.
const GAME_PLANS = {
	BULL: {
		label: "Bull",
		weights: { CHARGE: 1.4, FINISH: 1.3, FLANK: 0.8, MATADOR: 0.5, HOLD: 0.6 },
		params: { approachSpeed: 150, pushSpeed: 300, patience: 60, pace: 1.4 },
	},
	MATADOR: {
		label: "Matador",
		weights: { MATADOR: 1.5, HOLD: 1.0, CHARGE: 0.8, FINISH: 1.2, FLANK: 0.8 },
		params: { dodgeTrigger: 170, patience: 300, pace: 1.0 },
	},
	TURTLE: {
		label: "Turtle",
		weights: { HOLD: 1.5, CHARGE: 0.7, FINISH: 1.2, MATADOR: 0.9, FLANK: 0.6, ESCAPE: 1.2 },
		params: { resistSpeed: 180, patience: 900, pace: 0.8 },
	},
	HUNTER: {
		label: "Hunter",
		weights: { FLANK: 1.5, CHARGE: 0.9, FINISH: 1.3, HOLD: 0.8, MATADOR: 0.7 },
		params: { approachSpeed: 140, patience: 150, pace: 1.2 },
	},
};

const BRAIN = {
	MIN_TICKS_IN_TACTIC: 10,
	HYSTERESIS: 0.08,
	EMERGENCY_SCORE: 0.75,  // ESCAPE / FINISH above this switch immediately
	UCB_EXPLORATION: 0.6,
	DISCOUNT: 0.95,         // older rounds weigh less: the opponent may be learning too
	PROFILE_SMOOTHING: 0.3,
};

class Brain {

	// Called once per tick for every robot, right after the ray scans.
	static decide(player) {
		Perception.update(player);
		if (!player.fsm || !player.fsm.enabled)
			return; // manual hotkey override or remote control
		if (player.brainType == "classic") {
			Strategy.applyStateMachine(player);
			return;
		}
		Brain.think(player);
	}

	static ensureLearner(player) {
		if (player.learner == null) {
			const plans = {};
			for (const id in GAME_PLANS)
				plans[id] = { n: 0, reward: 0, rounds: 0, wins: 0, ties: 0, losses: 0 };
			player.learner = { plans, rounds: 0, opponent: { aggression: 0.3, pushBalance: 0 } };
		}
		return player.learner;
	}

	static ensureBrain(player) {
		if (player.brain == null) {
			const planId = Brain.choosePlan(player, Brain.ensureLearner(player));
			player.brain = { planId, plan: GAME_PLANS[planId], tactic: null, reason: "INIT", ticksInTactic: 0, passiveTicks: 0, scores: [] };
		}
		return player.brain;
	}

	static onRoundStart(player) {
		const learner = Brain.ensureLearner(player);
		Perception.reset(player, learner.opponent);
		player.brain = null;
		if (player.brainType == "adaptive")
			Brain.ensureBrain(player);
	}

	// outcome: "WIN" | "TIE" | "LOSS". Only rounds the brain actually fought count.
	static onRoundEnd(player, outcome) {
		if (player.brainType != "adaptive" || player.brain == null || !player.fsm.enabled)
			return;
		const learner = Brain.ensureLearner(player);
		for (const id in learner.plans) {
			learner.plans[id].n *= BRAIN.DISCOUNT;
			learner.plans[id].reward *= BRAIN.DISCOUNT;
		}
		const stats = learner.plans[player.brain.planId];
		stats.n += 1;
		stats.reward += outcome == "WIN" ? 1 : outcome == "TIE" ? 0.5 : 0;
		stats.rounds++;
		if (outcome == "WIN") stats.wins++;
		else if (outcome == "TIE") stats.ties++;
		else stats.losses++;
		learner.rounds++;

		const model = player.perception.model;
		const k = BRAIN.PROFILE_SMOOTHING;
		learner.opponent.aggression += k * (model.aggression - learner.opponent.aggression);
		learner.opponent.pushBalance += k * (model.pushBalance - learner.opponent.pushBalance);
	}

	// Discounted UCB1: try every plan once, then balance the best average
	// reward against plans that have not been tried for a while.
	static choosePlan(player, learner) {
		if (GAME_PLANS[player.planChoice])
			return player.planChoice;
		const ids = Object.keys(GAME_PLANS);
		const untried = ids.filter(id => learner.plans[id].rounds == 0);
		if (untried.length)
			return untried[Math.floor(Math.random() * untried.length)];
		const total = ids.reduce((sum, id) => sum + learner.plans[id].n, 0);
		let best = ids[0], bestScore = -Infinity;
		for (const id of ids) {
			const st = learner.plans[id];
			const n = Math.max(st.n, 1e-3);
			const score = st.reward / n + BRAIN.UCB_EXPLORATION * Math.sqrt(Math.log(Math.max(total, 1.0001)) / n);
			if (score > bestScore) {
				best = id;
				bestScore = score;
			}
		}
		return best;
	}

	static think(player) {
		const brain = Brain.ensureBrain(player);
		const scores = Brain.scoreTactics(player, brain);
		brain.scores = scores;

		const best = scores[0];
		const current = brain.tactic;
		let next = current;
		if (current == null) {
			next = best.id;
		} else if (best.id != current) {
			// Tactics that do not apply right now (e.g. SEARCH with the opponent in sight) are not scored.
			const entry = scores.find(s => s.id == current);
			if (entry == null) {
				next = best.id;
			} else {
				const emergency = (best.id == "ESCAPE" || best.id == "FINISH") && best.score >= BRAIN.EMERGENCY_SCORE;
				const settled = brain.ticksInTactic >= BRAIN.MIN_TICKS_IN_TACTIC && !Brain.isBusy(player, current);
				if (best.score > entry.score + BRAIN.HYSTERESIS && (emergency || settled))
					next = best.id;
			}
		}

		if (next != current) {
			brain.tactic = next;
			brain.ticksInTactic = 0;
			const key = TACTICS[next].memoryKey;
			if (key && player.memory) delete player.memory[key];
		} else {
			brain.ticksInTactic++;
		}
		brain.reason = scores.find(s => s.id == next).reason;

		// Boredom: passive ticks without touching the opponent push the plan to engage.
		const p = player.perception;
		if (p.contact.active) brain.passiveTicks = 0;
		else if (next == "HOLD" || next == "SEARCH" || (next == "MATADOR" && !Brain.isBusy(player, next))) brain.passiveTicks++;

		player.strategyFunc = Strategy[TACTICS[next].drive];
		player.fsm.currentState = next;
		player.fsm.lastReason = brain.reason;
	}

	// A tactic in the middle of a manoeuvre should not be interrupted lightly.
	static isBusy(player, tactic) {
		if (tactic == "MATADOR") {
			const m = player.memory && player.memory.matador;
			return m != null && m.phase != "WAIT";
		}
		return false;
	}

	static scoreTactics(player, brain) {
		const p = player.perception;
		const s = p.self, e = p.enemy, c = p.contact, m = p.model;
		const params = Strategy.getTacticParams(player);
		const clamp01 = v => Math.max(0, Math.min(1, v));
		const r = player.radius;

		const energy = player.energy / 100;
		const advantage = energy - e.energyEst / 100;
		const known = e.visible || e.ticksUnseen < 20;
		const danger = s.localized ? clamp01(1 - (s.edgeMargin - 30) / 120) : 1;
		const opportunity = known && e.pos ? clamp01(1 - (e.edgeMargin - 30) / 150) : 0;
		// Tired opponent: low estimated energy, unless we can see it still running about.
		const enemySpeed = e.visible ? Math.hypot(e.vel.x, e.vel.y) : 0;
		const tired = !known || enemySpeed > 4 ? 0 : e.energyEst < 12 ? 1 : e.energyEst < 25 || (e.idleTicks > 120 && e.energyEst < 40) ? 0.5 : 0;
		const passive = known && e.idleTicks > 60 ? 0.25 : 0;
		const losing = clamp01(-m.pushBalance * 2);
		const stall = clamp01(c.stalledTicks / 25); // head-on shove going nowhere
		const charging = e.visible && e.towardUs > PERCEPTION.CHARGE_SPEED * 0.6 && e.distance < 300;
		const boredom = clamp01(brain.passiveTicks / params.patience);
		const late = p.clock.remaining < 0.35;
		const timePressure = late && advantage <= 0 ? (0.35 - p.clock.remaining) * 2 : 0;
		// Energy pacing: the plan's pace is how fast it may drain the battery over the
		// round. Under that line (minus some slack) the costly tactics lose appeal.
		const paceLine = 100 * (1 - (params.pace || 1) * (1 - p.clock.remaining)) - 25;
		const overspend = clamp01((paceLine - player.energy) / 25);
		const runningAway = e.visible && e.towardUs < -3 && e.distance > 3 * r ? 1 : 0;
		// Last drops of battery: only what keeps us in the ring (or ends the round).
		const reserve = energy < 0.15 && tired == 0 ? 1 : 0;

		// +1 when pushing from us through the opponent points straight out of the ring.
		let outward = 0;
		if (e.pos && s.localized) {
			const dx = e.pos.x - s.pos.x, dy = e.pos.y - s.pos.y;
			const dl = Math.hypot(dx, dy) || 1, el = Math.hypot(e.pos.x, e.pos.y) || 1;
			outward = (dx * e.pos.x + dy * e.pos.y) / (dl * el);
		}

		const scores = [];
		const add = (id, score, reason) => {
			const weight = brain.plan.weights[id] != null ? brain.plan.weights[id] : 1;
			scores.push({ id, score: score * weight, reason });
		};

		{
			let v = danger * (1 - opportunity * clamp01(outward));
			if (c.active) v *= 1.2;
			if (c.side || c.back) v += 0.3 * (0.5 + danger);
			if (c.front && losing > 0.3) v += 0.3 * danger + 0.2 * losing;
			v += 0.2 * stall;
			add("ESCAPE", v, c.side || c.back ? "SHOVED_FROM_SIDE" : c.front && losing > 0.3 ? "LOSING_PUSH" : stall > 0.5 && danger < 0.3 ? "SHOVE_STALLED" : "EDGE_DANGER");
		}

		if ((e.visible || c.front) && e.pos) {
			const close = clamp01(1 - (e.distance - 2 * r) / 250);
			const v = opportunity * close * (outward > 0.2 ? 1 : 0.25) * (energy > 0.03 ? 1 : 0) + (c.front && opportunity > 0.3 ? 0.2 : 0);
			add("FINISH", v, "ENEMY_AT_EDGE");
		}

		if (known) {
			const v = 0.25 + 0.4 * clamp01(advantage * 3) + 0.6 * tired + passive + 0.4 * boredom + timePressure
				+ (c.front ? 0.25 : 0)
				- 0.6 * losing - 0.4 * danger - 0.2 * clamp01(-outward)
				- 0.4 * stall * (advantage < 0.1 ? 1 : 0.3)
				- 0.3 * runningAway // let it come back, chasing is the expensive part
				- (tired > 0 || timePressure > 0 ? 0 : 0.6 * overspend + 0.4 * clamp01(-advantage * 3))
				- (tired > 0 ? 0 : (energy < 0.25 ? 0.3 : 0)) - 0.6 * reserve;
			const reason = tired > 0 ? "ENEMY_TIRED" : timePressure > 0 ? "BEHIND_ON_TIME" : boredom > 0.6 ? "BREAK_STALEMATE"
				: advantage > 0.15 ? "ENERGY_ADVANTAGE" : c.front ? "CONTACT_FRONT" : passive ? "PASSIVE_OPPONENT" : "ENGAGE";
			add("CHARGE", v, reason);
		}

		if (known && e.pos && s.localized) {
			let v = 0.2 + 0.6 * losing + passive + 0.3 * boredom + 0.3 * clamp01(-outward)
				- 0.5 * danger - (c.active ? 0.3 : 0) - 0.5 * overspend - 0.3 * runningAway - 0.6 * reserve;
			if (outward > 0.85) v -= 0.3; // already on the inside line: just charge
			add("FLANK", v, losing > 0.3 ? "LOSING_HEAD_ON" : outward < 0 ? "OUTSIDE_LINE" : "GET_INSIDE_LINE");
		}

		if (e.visible || c.front || Brain.isBusy(player, "MATADOR")) {
			const v = 0.1 + 0.5 * m.aggression + (charging ? 0.45 : 0) + 0.7 * stall - 0.3 * danger - 0.5 * tired - 0.6 * reserve;
			add("MATADOR", v, charging ? "ENEMY_CHARGING" : stall > 0.5 ? "SHOVE_STALLED" : "AGGRESSIVE_OPPONENT");
		}

		{
			const protectLead = late && advantage > 0.05;
			let v = 0.3 + 0.35 * clamp01((s.distCenter - 100) / 200) + 0.25 * (1 - energy) + 0.3 * overspend + 0.4 * reserve - 0.45 * boredom - 0.5 * stall;
			if (protectLead) v += 0.5; // time-out goes to the fresher robot
			if (!s.localized) v -= 0.2;
			add("HOLD", v, protectLead ? "PROTECT_LEAD" : s.distCenter > 150 ? "RETURN_TO_CENTRE" : "SAVE_ENERGY");
		}

		if (!e.visible)
			add("SEARCH", e.ticksUnseen > 6 ? 0.65 : 0.25, "LOST_TARGET");

		scores.sort((a, b) => b.score - a.score);
		return scores;
	}

	// UI entry point: switch brain type and plan choice. A fixed plan takes over
	// straight away; AUTO lets the learner pick from the next round on.
	static configure(player, brainType, planChoice) {
		if (player.brainType != brainType) {
			player.brain = null;
			player.memory = null;
			player.fsm.currentState = null;
		}
		player.brainType = brainType;
		player.planChoice = planChoice;
		if (brainType == "adaptive") {
			const brain = Brain.ensureBrain(player);
			if (GAME_PLANS[planChoice] && brain.planId != planChoice) {
				brain.planId = planChoice;
				brain.plan = GAME_PLANS[planChoice];
			}
		}
	}

	static resetLearning(player) {
		player.learner = null;
		Brain.ensureLearner(player);
	}

	static learningRows(player) {
		const learner = player.learner;
		if (learner == null) return [];
		return Object.keys(GAME_PLANS).map(id => {
			const st = learner.plans[id];
			return {
				id,
				label: GAME_PLANS[id].label,
				rounds: st.rounds,
				wins: st.wins,
				ties: st.ties,
				losses: st.losses,
				value: st.n > 0 ? st.reward / st.n : null,
				current: player.brain != null && player.brain.planId == id,
			};
		});
	}

	static describeLearning(player) {
		return Brain.learningRows(player)
			.map(row => `${row.id} ${row.wins}/${row.ties}/${row.losses}` + (row.value != null ? ` (${row.value.toFixed(2)})` : ""))
			.join(" | ");
	}
}

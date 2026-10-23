// Headless arena: runs CPU vs CPU rounds in Node, without browser or canvas,
// loading the same game and strategy scripts as index.html. Useful to compare
// brains and game plans over hundreds of rounds.
//
//   node tools/arena.js --rounds 200 --a adaptive --b classic --seed 7
//   node tools/arena.js --a adaptive:MATADOR --b adaptive:BULL
//
// Fighter spec: <brain>[:<plan>]  brain = classic | adaptive, plan = AUTO or a
// game plan id (adaptive brain only). Fighters swap start side every round so
// the side does not bias the result. The adaptive learner keeps learning across
// all the rounds of one run, exactly as it does in the browser.

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const SKIPPED_SCRIPTS = ["ZzFXMicro.min.js", "sounds.js", "app.js"];

function parseArgs(argv) {
	const opts = { rounds: 100, a: "classic", b: "classic", seed: 1, swap: true, verbose: false };
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg == "--rounds") opts.rounds = Number(argv[++i]);
		else if (arg == "--a") opts.a = argv[++i];
		else if (arg == "--b") opts.b = argv[++i];
		else if (arg == "--seed") opts.seed = Number(argv[++i]);
		else if (arg == "--no-swap") opts.swap = false;
		else if (arg == "--verbose") opts.verbose = true;
	}
	return opts;
}

function parseFighter(spec, label) {
	const [brain, plan] = spec.split(":");
	return { label: label + "=" + spec, brain: brain || "classic", plan: (plan || "AUTO").toUpperCase() };
}

// Script list taken from index.html so the arena follows new strategy files automatically.
function gameScripts() {
	const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
	const scripts = [];
	const re = /<script src="(scripts\/[^"]+)"><\/script>/g;
	let m;
	while ((m = re.exec(html)) != null) {
		if (!SKIPPED_SCRIPTS.includes(path.basename(m[1])))
			scripts.push(m[1]);
	}
	return scripts;
}

function createWorld(seed) {
	const sandbox = {
		console,
		width: 1280,
		height: 900,
		BASE_DELTA_TIME: 0.12,
		deltaTime: 0.12,
		TICKS_PER_SECOND: 60,
		MATCH_DURATION_SECONDS: 60,
		showRays: false,
		showTrails: false,
		showBoundaries: false,
		playSounds: false,
		playCollisionSound: false,
		playSound() {},
		restarts: 0,
	};
	// game.simulateTick() restarts "boring" rounds through the global init().
	sandbox.init = () => {
		sandbox.restarts++;
		vm.runInContext("game.init()", sandbox);
	};
	vm.createContext(sandbox);

	// Deterministic Math.random (mulberry32) so runs are reproducible.
	vm.runInContext(`
		(function (seed) {
			let s = seed >>> 0;
			Math.random = function () {
				s = (s + 0x6D2B79F5) >>> 0;
				let t = s;
				t = Math.imul(t ^ (t >>> 15), t | 1);
				t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
				return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
			};
		})(${seed});
	`, sandbox);

	for (const file of gameScripts()) {
		vm.runInContext(fs.readFileSync(path.join(ROOT, file), "utf8"), sandbox, { filename: file });
	}
	vm.runInContext("var game = new Game(); game.prepare(); game.mode = GAME_MODE.CPUvsCPU;", sandbox);
	return sandbox;
}

function emptyStats(fighter) {
	return {
		fighter,
		wins: 0,
		losses: 0,
		ties: 0,
		winBy: { RING_OUT: 0, TIMEOUT: 0, DOUBLE_KO: 0, STALL: 0 },
		selfExits: 0,
		energyLeft: 0,
	};
}

function runArena(opts) {
	const fighters = [parseFighter(opts.a, "A"), parseFighter(opts.b, "B")];
	const stats = fighters.map(emptyStats);
	// What each fighter learned travels with it when it changes start side.
	const learners = [null, null];
	const world = createWorld(opts.seed);
	const game = vm.runInContext("game", world);
	const ticksPerRound = world.TICKS_PER_SECOND * world.MATCH_DURATION_SECONDS;
	const maxTicks = ticksPerRound * 4;
	let totalTicks = 0;
	let ties = 0;
	const reasons = {};

	const started = Date.now();
	for (let round = 0; round < opts.rounds; round++) {
		// slotFighter[0] is the fighter index playing slot A (left) this round.
		const slotFighter = opts.swap && round % 2 == 1 ? [1, 0] : [0, 1];
		const slots = [game.player_A, game.player_B];
		slots.forEach((player, s) => {
			const f = fighters[slotFighter[s]];
			player.brainType = f.brain;
			player.planChoice = f.plan;
			player.learner = learners[slotFighter[s]];
		});

		game.init();
		game.status = vm.runInContext("GAME_STATUS.GAME_RUNNING", world);
		world.restarts = 0;

		const lastTouch = [-Infinity, -Infinity];
		let result = null;
		let tick = 0;
		while (result == null) {
			game.simulateTick();
			tick++;
			// A shove bounces the bodies apart a little every tick (see Game.collideAndPush),
			// so "touching" allows for that gap.
			if (game.player_A.distanceTo(game.player_B) < game.player_A.radius + game.player_B.radius + 25) {
				lastTouch[0] = lastTouch[1] = tick;
			}
			result = game.checkRoundResult();
			if (result == null && tick >= maxTicks)
				result = { winner: "TIE", reason: "STALL" };
		}
		totalTicks += tick;
		reasons[result.reason] = (reasons[result.reason] || 0) + 1;
		game.finishRound(result);
		slots.forEach((player, s) => learners[slotFighter[s]] = player.learner);

		const winnerSlot = result.winner == "A" ? 0 : result.winner == "B" ? 1 : -1;
		slots.forEach((player, s) => {
			const st = stats[slotFighter[s]];
			st.energyLeft += Math.max(0, player.energy);
			if (winnerSlot == -1) {
				st.ties++;
			} else if (winnerSlot == s) {
				st.wins++;
				st.winBy[result.reason]++;
			} else {
				st.losses++;
				// Left the ring with battery and no contact in the last half second: walked out alone.
				if (result.reason == "RING_OUT" && tick - lastTouch[s] > 30 && player.energy > 0)
					st.selfExits++;
			}
		});
		if (winnerSlot == -1) ties++;

		if (opts.verbose) {
			const who = winnerSlot == -1 ? "TIE" : fighters[slotFighter[winnerSlot]].label;
			console.log(`round ${round + 1}: ${who} by ${result.reason} at ${(tick / world.TICKS_PER_SECOND).toFixed(1)}s` +
				(world.restarts ? ` (${world.restarts} restarts)` : ""));
		}
	}
	const elapsed = (Date.now() - started) / 1000;

	console.log(`\n${opts.rounds} rounds, seed ${opts.seed}, ${elapsed.toFixed(1)}s wall, avg round ${(totalTicks / opts.rounds / world.TICKS_PER_SECOND).toFixed(1)}s fight time`);
	console.log("Endings:", JSON.stringify(reasons));
	for (const st of stats) {
		const n = opts.rounds;
		console.log(`\n${st.fighter.label}`);
		console.log(`  wins ${st.wins} (${(100 * st.wins / n).toFixed(1)}%)  losses ${st.losses}  ties ${st.ties}`);
		console.log(`  wins by: ring-out ${st.winBy.RING_OUT}, timeout ${st.winBy.TIMEOUT}`);
		console.log(`  self ring-outs (lost without contact): ${st.selfExits}`);
		console.log(`  avg energy left: ${(st.energyLeft / n).toFixed(1)}`);
	}

	// What the adaptive fighters learned: plan W/T/L (discounted mean reward).
	const describe = vm.runInContext("Brain.describeLearning", world);
	fighters.forEach((f, i) => {
		if (f.brain == "adaptive" && learners[i])
			console.log(`\nLearning ${f.label}: ${describe({ learner: learners[i], brain: null })}`);
	});

	return { stats, ties, reasons };
}

if (require.main === module) {
	runArena(parseArgs(process.argv.slice(2)));
}

module.exports = { runArena, parseArgs, createWorld };


var canvas,
ctx,
width,
height;

// mouse event variables
var mousePosition = { x: 0, y: 0 }
var mouseLeftPressed = false;

// Time-speed control
//
// The simulation is built around a fixed step of BASE_DELTA_TIME per tick.
// Every constant in the game (energy drain, contact timer, FSM tick
// thresholds, particle friction, trail decay, etc.) is calibrated to that
// fixed step. To provide a faithful time-speed slider we don't distort dt;
// instead we schedule more or fewer ticks per rendered frame:
//   * timeScale = 1.0 → 1 tick per frame (normal fight speed)
//   * timeScale > 1   → multiple ticks per frame (fast-forward)
//   * timeScale < 1   → a tick every N frames (slow motion)
//   * timeScale = 0   → no ticks run (time frozen)
// timeAccumulator stores leftover sub-tick time across frames so fractional
// scales (e.g. 0.25x, 1.75x) are honored exactly over time.
const BASE_DELTA_TIME = 0.12;
const MAX_SUBSTEPS_PER_FRAME = 8;
// One simulation tick at 1x maps to 1/60 of a fight second. Used by the
// fight timer so it stays in sync with the browser's 60 fps target.
const TICKS_PER_SECOND = 60;
// Round length in fight seconds. When it reaches 0 the round is decided
// by energy (more energy wins, equal = TIE).
const MATCH_DURATION_SECONDS = 60;
var timeScale = 1.0;
var timeAccumulator = 0;
var deltaTime = BASE_DELTA_TIME;
// Alpha in [0,1) representing how far we are between the last simulated
// tick and the next pending one. Used to lerp positions for smooth slow-mo.
var renderAlpha = 0;
var showRays = false;
var showPerception = true;
var showTrails = true;

var playSounds = true;
var playCollisionSound = true;
var showBoundaries = false;
var showCameraView = false;
var showFsmDebug = true;
var fsmTuningConfigs = {
	A: {
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
	},
	B: {
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
	}
};

let score_A = 0;
let score_B = 0;

var menuGame, modalMenuGame, modalEl, scoreAEl, scoreBEl, matchTimerEl;
var strategyAFuncText, strategyBFuncText;
var statusAText, statusBText;

var hitSoundTime = 0;
var trailTime = 0;


modalEl = document.getElementById('modalEl');
scoreAEl = document.getElementById('scoreAEl');
scoreBEl = document.getElementById('scoreBEl');
scoreBigEl = document.getElementById('scoreBigEl');
matchTimerEl = document.getElementById('matchTimerEl');
strategyAFuncText = document.getElementById('strategyAFuncText');
strategyBFuncText = document.getElementById('strategyBFuncText');
statusAText = document.getElementById('statusAText');
statusBText = document.getElementById('statusBText');
menuGame = document.getElementById('menuGame');
modalMenuGame = document.getElementById("my-modal");


var game = new Game();

function prepare() {


	// canvas
	canvas = document.getElementById('canvas');
	width = window.innerWidth;
	height = window.innerHeight;
	canvas.width = width;
	canvas.height = height;
	ctx = canvas.getContext('2d');

	game.prepare();
	// New robots after a resize: re-apply the brain panel choices.
	UpdateBrains();

	if (game.player_B)
		game.status = GAME_STATUS.GAME_MENU;
	else 
		gameMenuStart(GAME_MODE.CPUvsCPU);

}

function gamePauseHandler() {
	if (game.status != GAME_STATUS.GAME_PAUSED) {
		gamePauseBtn.innerHTML = "Continue";
		game.status = GAME_STATUS.GAME_PAUSED;
	} else {
		game.status = GAME_STATUS.GAME_RUNNING;
		gamePauseBtn.innerHTML = "Pause";
	}

}

function gameMenuBack() {
	game.mode = GAME_MODE.NONE;
	modalEl.style.display = 'none';
	menuGame.style.display = 'flex';
	modalMenuGame.style.display = 'flex';
	game.status = GAME_STATUS.GAME_MENU;
}

function gameMenuStart(mode) {

	game.mode = mode;
	init();

	menuGame.style.display = 'none';
	modalMenuGame.style.display = 'none';
	game.status = GAME_STATUS.GAME_RUNNING;
}

function init() {

	game.init();

	modalEl.style.display = 'none';
	yukoScoreA.style.display = 'none';
	yukoScoreB.style.display = 'none';

	renderLearning();

}

// Brain panel (per robot): brain type, game plan, live decision and what it learned.
function UpdateBrains() {
	[["A", game.player_A], ["B", game.player_B]].forEach(([slot, player]) => {
		if (!player) return;
		const type = document.getElementById(`brain${slot}_type`).value;
		const planSelect = document.getElementById(`brain${slot}_plan`);
		planSelect.disabled = type != "adaptive";
		Brain.configure(player, type, planSelect.value);
	});
	renderLearning();
}

function ResetLearning(slot) {
	const player = slot == "A" ? game.player_A : game.player_B;
	if (!player) return;
	Brain.resetLearning(player);
	renderLearning();
}

function renderLearning() {
	[["A", game.player_A], ["B", game.player_B]].forEach(([slot, player]) => {
		const table = document.getElementById(`brain${slot}_learning`);
		if (!table || !player) return;
		const rows = Brain.learningRows(player);
		if (player.brainType != "adaptive" || rows.length == 0) {
			table.innerHTML = "";
			return;
		}
		table.innerHTML = "<tr><th>Plan</th><th>Rounds</th><th>W-T-L</th><th>Value</th></tr>" + rows.map(row =>
			`<tr class="${row.current ? "brain-learning-current" : ""}"><td>${row.current ? "&#9656; " : ""}${row.label}</td>` +
			`<td>${row.rounds}</td><td>${row.wins}-${row.ties}-${row.losses}</td>` +
			`<td>${row.value == null ? "-" : row.value.toFixed(2)}</td></tr>`).join("");
	});
}

function describeBrain(player) {
	if (!player.fsm.enabled)
		return "Manual control (hotkeys / remote)";
	if (player.brainType == "classic")
		return `Classic FSM\nstate  ${player.fsm.currentState}\nreason ${player.fsm.lastReason}`;
	const brain = player.brain, p = player.perception;
	if (!brain || !p) return "";
	const shoves = p.model.pushBalance > 0.15 ? "winning" : p.model.pushBalance < -0.15 ? "losing" : "even";
	return `plan    ${brain.plan.label}${player.planChoice == "AUTO" ? " (auto)" : " (fixed)"}\n` +
		`tactic  ${brain.tactic || "-"}  ${brain.reason}\n` +
		`enemy   energy~${Math.round(p.enemy.energyEst)}  aggression ${p.model.aggression.toFixed(2)}  shoves ${shoves}`;
}



// Per-tick match event detection: scoring, ring-out, double KO and dummy
// teleport. Runs inside the sub-step loop so at fast-forward speeds we don't
// miss a ring-out that happened mid-frame.
function evaluateMatchEvents() {

	if (game.status != GAME_STATUS.GAME_RUNNING) return;

	if (game.player_Dummy) {
		if (game.collide(game.player_A, game.player_Dummy)) {
			while (game.checkDojoLimits(game.player_Dummy, game.dojo)) {
				game.player_Dummy.pos.x = Math.random() * width;
				game.player_Dummy.pos.y = Math.random() * height;
			}
		}
	}

	if (game.players.length > 1 && !game.player_Dummy) {

		const result = game.checkRoundResult();
		if (result) {
			if (result.winner == "A") score_A += 1;
			if (result.winner == "B") score_B += 1;
			game.finishRound(result);
			renderLearning();
			scoreGoal(result.winner);
		}

	} else {
		if (game.player_A.energy <= 0) {
			scoreGoal("TIE");
			return;
		}
		if (game.matchTime >= MATCH_DURATION_SECONDS) {
			scoreGoal("TIE");
			return;
		}
	}
}

// Refresh UI-only panels (strategy source, status dump). Runs once per
// rendered frame regardless of how many sim ticks were processed.
function refreshStatusPanels() {

	if (game.status != GAME_STATUS.GAME_RUNNING) return;

	if (game.player_A)
		strategyAFuncText.innerHTML = JSON.stringify(game.player_A.strategyFunc.toString().replace(/\n\n/g, "\n").replace(/\n/g, "&#13;").replace(/\r/g, "").replace(/\t/g, "  "));
	if (game.player_B)
		strategyBFuncText.innerHTML = JSON.stringify(game.player_B.strategyFunc.toString().replace(/\n\n/g, "\n").replace(/\n/g, "&#13;").replace(/\r/g, "").replace(/\t/g, "  "));

	if (game.player_A)
		statusAText.innerHTML = JSON.stringify(game.player_A.getInfo(), null, 2);
	if (game.player_B)
		statusBText.innerHTML = JSON.stringify(game.player_B.getInfo(), null, 2);

	if (game.player_A)
		brainA_now.textContent = describeBrain(game.player_A);
	if (game.player_B)
		brainB_now.textContent = describeBrain(game.player_B);
}

function step() {

	// Hotkeys are processed once per rendered frame so slow-mo/pause still
	// responds instantly to user overrides.
	game.runHotkeys();

	if (game.mode == GAME_MODE.NONE)
		return;

	if (game.status == GAME_STATUS.GAME_MENU) {}

	if (game.status == GAME_STATUS.GAME_GOAL) {
		if (input.espace || input.enter)
			gameBtn.click();
	}

	if (game.status == GAME_STATUS.GAME_RUNNING) {

		// Accumulate fractional time so slow speeds still advance eventually,
		// and clamp the accumulator to avoid catch-up spikes if the tab was
		// backgrounded.
		timeAccumulator += timeScale;
		if (timeAccumulator > MAX_SUBSTEPS_PER_FRAME) timeAccumulator = MAX_SUBSTEPS_PER_FRAME;

		const subSteps = Math.floor(timeAccumulator);
		timeAccumulator -= subSteps;

		// Each sub-step uses the calibrated base step. Every system that
		// depends on deltaTime keeps its original behaviour untouched.
		deltaTime = BASE_DELTA_TIME;

		for (let i = 0; i < subSteps; i++) {
			if (game.status != GAME_STATUS.GAME_RUNNING) break;
			// Snapshot pre-tick pose so the renderer can interpolate between
			// the last and current tick while acc drifts from 0 to 1 at low
			// time scales (avoids visible jumps at e.g. 0.05x).
			captureRenderPrev();
			game.simulateTick();
			evaluateMatchEvents();
		}

		// How far the visual interpolation has advanced toward the next
		// pending tick. At >=1x this stays near 0 (no visible lag). At slow
		// scales it smoothly ramps 0 → 1 across the frames between ticks.
		renderAlpha = timeAccumulator;

		refreshStatusPanels();
	}

}

function captureRenderPrev() {
	game.players.forEach(p => p.captureRenderPrev());
	game.particles.forEach(pt => pt.captureRenderPrev());
}

// Temporarily replace pos/heading with an interpolated value so the drawing
// code (player.draw, particle.draw, trails, etc.) renders a smooth pose
// between simulation ticks. Must be paired with restoreInterpolatedRender().
function applyInterpolatedRender(alpha) {
	if (alpha <= 0 || game.status != GAME_STATUS.GAME_RUNNING) return;

	game.players.forEach(p => {
		if (!p._hasRenderPrev) return;
		p._renderBackup = { x: p.pos.x, y: p.pos.y, heading: p.heading };
		p.pos.x = p._renderPrev.x + (p.pos.x - p._renderPrev.x) * alpha;
		p.pos.y = p._renderPrev.y + (p.pos.y - p._renderPrev.y) * alpha;
		// Interpolate heading along the shortest angular distance.
		let dh = p.heading - p._renderPrev.heading;
		while (dh > Math.PI) dh -= 2 * Math.PI;
		while (dh < -Math.PI) dh += 2 * Math.PI;
		p.heading = p._renderPrev.heading + dh * alpha;
	});

	game.particles.forEach(pt => {
		if (!pt._hasRenderPrev) return;
		pt._renderBackup = { x: pt.x, y: pt.y };
		pt.x = pt._prevX + (pt.x - pt._prevX) * alpha;
		pt.y = pt._prevY + (pt.y - pt._prevY) * alpha;
	});
}

function restoreInterpolatedRender() {
	game.players.forEach(p => {
		if (p._renderBackup) {
			p.pos.x = p._renderBackup.x;
			p.pos.y = p._renderBackup.y;
			p.heading = p._renderBackup.heading;
			p._renderBackup = null;
		}
	});
	game.particles.forEach(pt => {
		if (pt._renderBackup) {
			pt.x = pt._renderBackup.x;
			pt.y = pt._renderBackup.y;
			pt._renderBackup = null;
		}
	});
}

function draw() {

	// clean canvas
	ctx.fillStyle = 'rgb(80,80,80, 0.9)';
	ctx.fillRect(0, 0, width, height);
	ctx.globalAlpha = 0.9;

	applyInterpolatedRender(renderAlpha);
	game.draw();
	if (showPerception) {
		drawPerception();
	}
	restoreInterpolatedRender();

	if (showFsmDebug) {
		drawFsmDebug();
	}

	// CAMERA VIEW
	if (showCameraView) {
		var imgSize = 200;
		var imgData = ctx.getImageData(player_A.pos.x - imgSize * 1 / 10, player_A.pos.y - imgSize * 1 / 2, imgSize, imgSize);
		ctx.putImageData(imgData, 10, 70);
	}

	scoreAEl.innerHTML = score_A;
	scoreBEl.innerHTML = score_B;

	if (matchTimerEl) {
		const remaining = Math.max(0, MATCH_DURATION_SECONDS - game.matchTime);
		matchTimerEl.textContent = formatCountdown(remaining);

		// Visual warning cues as the round approaches timeout.
		matchTimerEl.classList.toggle("topbar-timer-warning", remaining < 10 && remaining > 3);
		matchTimerEl.classList.toggle("topbar-timer-critical", remaining <= 3);
	}
}

// Format a positive seconds value as "M:SS.t" with tenths of a second.
function formatCountdown(seconds) {
	if (!isFinite(seconds) || seconds < 0) seconds = 0;
	const totalTenths = Math.floor(seconds * 10);
	const minutes = Math.floor(totalTenths / 600);
	const secs = Math.floor((totalTenths % 600) / 10);
	const tenths = totalTenths % 10;
	const secsStr = secs < 10 ? "0" + secs : "" + secs;
	return minutes + ":" + secsStr + "." + tenths;
}

function drawFsmDebug() {
	const rows = [];
	if (game.player_A) rows.push({ label: "A", player: game.player_A });
	if (game.player_B) rows.push({ label: "B", player: game.player_B });
	if (rows.length === 0) return;

	const x = 12;
	const y = 120;
	const panelWidth = 440;
	const rowHeight = 86;
	const panelHeight = 16 + rows.length * rowHeight;

	ctx.save();
	ctx.fillStyle = "rgba(0,0,0,0.55)";
	ctx.fillRect(x, y, panelWidth, panelHeight);
	ctx.strokeStyle = "rgba(255,255,255,0.25)";
	ctx.lineWidth = 1;
	ctx.strokeRect(x, y, panelWidth, panelHeight);

	ctx.font = "bold 12px verdana";
	ctx.fillStyle = "white";
	ctx.fillText("AI Debug", x + 10, y + 18);

	ctx.font = "11px monospace";
	rows.forEach((entry, index) => {
		const player = entry.player;
		const fsm = player.fsm || {};
		const offsetY = y + 36 + index * rowHeight;
		const lines = player.brainType == "adaptive" && fsm.enabled ? adaptiveDebugLines(player) : classicDebugLines(player);

		ctx.fillStyle = player.color;
		ctx.fillText(`[${entry.label}]`, x + 10, offsetY);
		ctx.fillStyle = "white";
		lines.forEach((line, i) => ctx.fillText(line, x + 46, offsetY + i * 16));
	});

	ctx.restore();
}

function classicDebugLines(player) {
	const fsm = player.fsm || {};
	const s = fsm.lastSignals || {};
	const state = fsm.enabled ? (fsm.currentState || "INIT") : "MANUAL";
	const borderFront = s.distBorderFront === Infinity ? "INF" : s.distBorderFront;
	const borderSide = s.distBorderSideMin === Infinity ? "INF" : s.distBorderSideMin;
	return [
		`classic state=${state} reason=${fsm.lastReason || "NONE"}`,
		`energy=${Math.round(player.energy)} contact=${player.inContact ? 1 : 0} visible=${s.enemyVisible ? 1 : 0}`,
		`frontStrong=${s.enemyFrontStrong ? 1 : 0} borderFront=${borderFront} borderSide=${borderSide}`,
		`noProgressTicks=${s.noProgressTicks || 0}`,
	];
}

function adaptiveDebugLines(player) {
	const brain = player.brain, p = player.perception;
	if (!brain || !p) return ["adaptive (starting)"];
	const top = (brain.scores || []).slice(0, 3).map(s => `${s.id} ${s.score.toFixed(2)}`).join("  ");
	const edge = v => Number.isFinite(v) ? Math.round(v) : "?";
	return [
		`${brain.planId} > ${brain.tactic} (${brain.reason})`,
		`energy=${Math.round(player.energy)} enemy~${Math.round(p.enemy.energyEst)} contact=${p.contact.active ? (p.contact.front ? "front" : p.contact.back ? "back" : "side") : "-"} visible=${p.enemy.visible ? 1 : 0}`,
		`edge=${edge(p.self.edgeMargin)} enemyEdge=${edge(p.enemy.edgeMargin)} aggr=${p.model.aggression.toFixed(2)} push=${p.model.pushBalance.toFixed(2)}`,
		`top: ${top}`,
	];
}

// What each adaptive robot believes, drawn relative to where its body was when
// it sensed: the ring centre from its self localisation (cross) and the tracked
// opponent (circle, dashed while out of sight, i.e. predicted).
function drawPerception() {
	game.players.forEach(player => {
		const p = player.perception;
		if (!p || !p.self.localized || player.brainType != "adaptive") return;
		const cx = p.origin.x - p.self.pos.x;
		const cy = p.origin.y - p.self.pos.y;

		ctx.save();
		ctx.strokeStyle = player.color;
		ctx.lineWidth = 2;

		ctx.beginPath();
		ctx.moveTo(cx - 8, cy - 8);
		ctx.lineTo(cx + 8, cy + 8);
		ctx.moveTo(cx + 8, cy - 8);
		ctx.lineTo(cx - 8, cy + 8);
		ctx.stroke();

		const e = p.enemy;
		if (e.pos && e.ticksUnseen < 120) {
			ctx.setLineDash(e.visible ? [] : [5, 5]);
			ctx.beginPath();
			ctx.arc(cx + e.pos.x, cy + e.pos.y, player.radius * 0.6, 0, Math.PI * 2);
			ctx.stroke();
		}
		ctx.restore();
	});
}

function scoreGoal(yuko) {

	game.status = GAME_STATUS.GAME_GOAL;

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

	if (game.status == GAME_STATUS.GAME_GOAL && game.mode == GAME_MODE.CPUvsCPU) {
		setTimeout(() => {
			gameBtn.click();
		}, 1500);
	}
}

// Element Event Listeners


gameBtn.addEventListener('click', () => {
	init();

	setTimeout(() => {
		game.status = GAME_STATUS.GAME_RUNNING;
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

// Event Listeners

addEventListener('resize', prepare);


addEventListener('keydown', onkeydown);
addEventListener('keyup', onkeyup);

addEventListener('mousedown', (event) => {
	mousePosition = { x: event.clientX, y: event.clientY }
	game.mouseDownEvent(mousePosition);
});

addEventListener('mousemove', (event) => {
	mousePosition = { x: event.clientX, y: event.clientY }
	game.mouseMoveEvent(mousePosition);
});

addEventListener('mouseup', (event) => {
	mousePosition = { x: event.clientX, y: event.clientY }
	game.mouseUpEvent(mousePosition);
});

addEventListener('contextmenu', function (event) {
	event.preventDefault();
	event.stopPropagation();
	return false;
});

var handleScroll = function (event) {

	return event.preventDefault() && false;
};
addEventListener('DOMMouseScroll', handleScroll, false);
addEventListener('mousewheel', handleScroll, false);



function loop() {
	requestAnimationFrame(loop);
	step();
	draw();
}

prepare();
init();
UpdateSettings();
loop();

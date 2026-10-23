
// Matador (henka): wait facing the opponent; when it charges, side-step at the
// last moment towards the ring centre and hit its flank as it goes past.
// Phases: WAIT -> DODGE -> COUNTER -> WAIT. After a counter there is a short
// cooldown so a clinch does not turn into an endless, draining dodge loop.
Strategy.matadorDrive = function (player, strategy = {
	name: "MATADOR"
}) {
	const p = player.perception;
	const s = p.self;
	const e = p.enemy;
	const params = Strategy.getTacticParams(player);
	const memory = Strategy.getTacticMemory(player, "matador", {
		phase: "WAIT",
		ticks: 0,
		dir: 1,
		touched: false,
		cooldown: 0
	});

	let d = { speed: 0, turn: 0, sideSpeed: 0 };
	const look = Strategy.lookBearing(p);
	d.turn = look != null ? Strategy.steer(look) : player.maxTurn * 0.5;
	memory.ticks++;
	if (memory.cooldown > 0) memory.cooldown--;

	switch (memory.phase) {
	case "WAIT": {
		const trigger = params.dodgeTrigger + Math.max(0, e.towardUs) * 4;
		const charging = e.visible && e.towardUs > 3 && e.distance < trigger;
		if (memory.cooldown == 0 && (charging || p.contact.front)) {
			memory.phase = "DODGE";
			memory.ticks = 0;
			// Step to the side that leads towards the centre (more room behind us).
			memory.dir = s.localized ? (Math.sin(s.centerBearing) >= 0 ? 1 : -1) : (s.edgeRight > s.edgeLeft ? 1 : -1);
		} else if (p.contact.front && s.localized) {
			// Cooling down in a clinch: resist only as the edge gets close, like HOLD CENTER.
			d.speed = params.resistSpeed * Math.max(0, Math.min(1, (260 - s.edgeMargin) / 160));
		} else if (s.localized && s.distCenter > params.holdRadius * 2) {
			const t = Strategy.translate(s.centerBearing, params.approachSpeed * 0.6);
			d.speed = t.speed;
			d.sideSpeed = t.sideSpeed;
		}
		break;
	}
	case "DODGE":
		d.sideSpeed = memory.dir * params.dodgeSpeed;
		if (memory.ticks >= 4) {
			memory.phase = "COUNTER";
			memory.ticks = 0;
			memory.touched = false;
		}
		break;
	case "COUNTER":
		if (Math.abs(look || 0) < 0.6)
			d.speed = params.pushSpeed;
		if (p.contact.active) memory.touched = true;
		if (memory.ticks > 15 || (memory.touched && !p.contact.active)) {
			memory.phase = "WAIT";
			memory.ticks = 0;
			memory.cooldown = 45;
		}
		break;
	}

	player.name = strategy.name;
	return Strategy.limitToRing(player, d, params.edgeSafety);
}


// Hold centre: own the middle of the dohyo facing the opponent. Standing still
// and turning costs almost no energy, so this is the energy-saving default and
// it forces the opponent to come to us. Shoved from the front, it leans in.
Strategy.holdCenterDrive = function (player, strategy = {
	name: "HOLD CENTER"
}) {
	const p = player.perception;
	const s = p.self;
	const params = Strategy.getTacticParams(player);

	let d = { speed: 0, turn: 0, sideSpeed: 0 };

	const look = Strategy.lookBearing(p);
	d.turn = look != null ? Strategy.steer(look) : player.maxTurn * 0.5;

	// On the last drops of battery only move when the edge is close.
	if (s.localized && s.distCenter > params.holdRadius && (player.energy > 15 || s.edgeMargin < 150)) {
		// Arrive without overshooting; the energy cost is per pixel, not per speed.
		const v = Math.min(params.approachSpeed, (s.distCenter - params.holdRadius) / deltaTime);
		const t = Strategy.translate(s.centerBearing, v);
		d.speed = t.speed;
		d.sideSpeed = t.sideSpeed;
	}

	// Energy judo: near the centre let the opponent pay for shoving us around;
	// resist harder only as the edge gets close. A lost or stalled shove is the
	// brain's cue to move on to ESCAPE or MATADOR.
	if (p.contact.front && s.localized) {
		const need = Math.max(0, Math.min(1, (260 - s.edgeMargin) / 160));
		d.speed = Math.max(d.speed, params.resistSpeed * need);
	}

	player.name = strategy.name;
	return Strategy.limitToRing(player, d, params.edgeSafety);
}

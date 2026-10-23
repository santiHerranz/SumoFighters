
// Escape: get out of a losing spot. Facing the opponent, slide towards the ring
// centre; when shoved, slide perpendicular to the contact (on the centre side)
// so the opponent's push slips off instead of being resisted head-on.
Strategy.escapeDrive = function (player, strategy = {
	name: "ESCAPE"
}) {
	const p = player.perception;
	const s = p.self;
	const c = p.contact;
	const params = Strategy.getTacticParams(player);

	let d = { speed: 0, turn: 0, sideSpeed: 0 };
	// Lost the ring line (outside it, facing out): look back in to relocalise.
	const look = s.fitAge > 8 ? s.centerBearing : Strategy.lookBearing(p);
	d.turn = look != null ? Strategy.steer(look) : 0;

	let bearing = s.centerBearing;
	if (c.active) {
		const a = c.bearing + Math.PI / 2, b = c.bearing - Math.PI / 2;
		const offA = Math.abs(Perception.normalizeAngle(a - s.centerBearing));
		const offB = Math.abs(Perception.normalizeAngle(b - s.centerBearing));
		bearing = offA < offB ? a : b;
	}
	const t = Strategy.translate(bearing, params.dodgeSpeed);
	d.speed = t.speed;
	d.sideSpeed = t.sideSpeed;

	player.name = strategy.name;
	return Strategy.limitToRing(player, d, params.edgeSafety * 0.5);
}

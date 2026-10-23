
// Charge: aim precisely at the opponent (perceived bearing, not raw ray counts),
// approach at cruising speed and burst on frontal contact. The approach speed
// drops near contact so the robots never tunnel through each other.
Strategy.chargeDrive = function (player, strategy = {
	name: "CHARGE"
}) {
	const p = player.perception;
	const e = p.enemy;
	const params = Strategy.getTacticParams(player);

	let d = { speed: 0, turn: 0, sideSpeed: 0 };

	const look = Strategy.lookBearing(p);
	d.turn = look != null ? Strategy.steer(look) : player.maxTurn;

	if (p.contact.front) {
		d.speed = Strategy.pushSpeed(player, params.pushSpeed);
	} else if (e.visible) {
		const misalign = Math.abs(e.bearing);
		d.speed = misalign < 0.35 ? params.approachSpeed : misalign < 0.8 ? params.approachSpeed * 0.4 : 0;
		// Close the last gap at a speed that keeps the per-tick step well under a body width.
		const gap = e.distance - player.radius * 2;
		if (gap < 60)
			d.speed = Math.min(Math.max(d.speed, params.pushSpeed * 0.6), (gap + 50) / deltaTime);
	}

	player.name = strategy.name;
	return Strategy.limitToRing(player, d, params.edgeSafety);
}

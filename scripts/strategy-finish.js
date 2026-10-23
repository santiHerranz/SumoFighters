
// Finish (yori-kiri): the opponent is near the edge, so push it straight out
// along the ring radius that passes through it, with an all-in burst.
Strategy.finishDrive = function (player, strategy = {
	name: "FINISH"
}) {
	const p = player.perception;
	const s = p.self;
	const e = p.enemy;
	const params = Strategy.getTacticParams(player);

	let d = { speed: 0, turn: 0, sideSpeed: 0 };

	if (e.pos == null || !s.localized) {
		const look = Strategy.lookBearing(p);
		d.turn = look != null ? Strategy.steer(look) : player.maxTurn;
		player.name = strategy.name;
		return d;
	}

	// Aim a little beyond the opponent, on the outward radius through it.
	const len = Math.hypot(e.pos.x, e.pos.y) || 1;
	const aimX = e.pos.x + e.pos.x / len * player.radius * 2;
	const aimY = e.pos.y + e.pos.y / len * player.radius * 2;
	const aim = Perception.normalizeAngle(Math.atan2(aimY - s.pos.y, aimX - s.pos.x) - player.heading);

	// Line up on the outward radius while approaching; once close, drive through
	// the opponent's centre: at the edge almost any push takes it out.
	const close = p.contact.front || (e.visible && e.distance < player.radius * 2.6);
	const target = close && e.visible ? e.bearing : e.visible ? e.bearing * 0.5 + aim * 0.5 : aim;
	d.turn = Strategy.steer(target);
	const aligned = Math.abs(target) < Math.PI / 180 * 25;
	if (p.contact.front)
		d.speed = Strategy.pushSpeed(player, params.finishSpeed);
	else
		d.speed = aligned ? params.finishSpeed * 0.7 : params.approachSpeed * 0.5;

	player.name = strategy.name;
	return Strategy.limitToRing(player, d, params.edgeSafety * 0.5);
}

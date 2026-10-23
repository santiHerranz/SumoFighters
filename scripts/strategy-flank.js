
// Flank: circle round the opponent (still facing it) until we stand on the
// inside line, between it and the ring centre, then drive through it so the
// push points outwards. Head-on pushes we keep losing become outward pushes.
Strategy.flankDrive = function (player, strategy = {
	name: "FLANK"
}) {
	const p = player.perception;
	const s = p.self;
	const e = p.enemy;
	const params = Strategy.getTacticParams(player);
	const memory = Strategy.getTacticMemory(player, "flank", {
		side: 0
	});

	if (e.pos == null || !s.localized)
		return Strategy.chargeDrive(player, strategy);

	let d = { speed: 0, turn: 0, sideSpeed: 0 };
	const look = Strategy.lookBearing(p);
	d.turn = look != null ? Strategy.steer(look) : player.maxTurn;

	// Unit vector from the opponent towards the ring centre (the inside line).
	const enemyDist = Math.hypot(e.pos.x, e.pos.y);
	const relX = s.pos.x - e.pos.x, relY = s.pos.y - e.pos.y;
	const relLen = Math.hypot(relX, relY) || 1;
	let inX = -e.pos.x / (enemyDist || 1), inY = -e.pos.y / (enemyDist || 1);
	if (enemyDist < 30) {
		inX = relX / relLen;
		inY = relY / relLen;
	}
	const onInsideLine = (relX * inX + relY * inY) / relLen > 0.85;

	if (onInsideLine || p.contact.front) {
		// In position: drive through the opponent, outwards.
		d.speed = p.contact.front ? Strategy.pushSpeed(player, params.pushSpeed) : params.approachSpeed * 1.2;
		player.name = strategy.name;
		return Strategy.limitToRing(player, d, params.edgeSafety);
	}

	// Orbit round the opponent towards the inside line, the short way.
	if (memory.side == 0)
		memory.side = relX * inY - relY * inX > 0 ? 1 : -1;
	const orbit = player.radius * 2 + 50;
	const angle = Math.atan2(relY, relX) + memory.side * 0.6;
	const wpX = e.pos.x + Math.cos(angle) * orbit;
	const wpY = e.pos.y + Math.sin(angle) * orbit;
	const wpBearing = Perception.normalizeAngle(Math.atan2(wpY - s.pos.y, wpX - s.pos.x) - player.heading);
	const t = Strategy.translate(wpBearing, params.approachSpeed);
	d.speed = t.speed;
	d.sideSpeed = t.sideSpeed;

	player.name = strategy.name;
	return Strategy.limitToRing(player, d, params.edgeSafety);
}

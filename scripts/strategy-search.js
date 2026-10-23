
// Search: spin towards where the opponent was last seen (or the side we were
// touched on) and drift back to the centre meanwhile, so a lost target never
// walks us out of the ring. Turning is almost free, moving is not.
Strategy.searchDrive = function (player, strategy = {
	name: "SEARCH"
}) {
	const p = player.perception;
	const memory = Strategy.getTacticMemory(player, "search", {
		dir: Math.random() < 0.5 ? -1 : 1
	});

	let d = { speed: 0, turn: 0, sideSpeed: 0 };

	if (p.contact.active) {
		memory.dir = p.contact.bearing < 0 ? -1 : 1;
	} else if (p.enemy.predictedBearing != null && Math.abs(p.enemy.predictedBearing) > Math.PI / 4) {
		// Outside the field of view: sweep the short way round towards it.
		memory.dir = p.enemy.predictedBearing < 0 ? -1 : 1;
	}
	d.turn = memory.dir * player.maxTurn;

	if (p.self.localized && p.self.distCenter > 120) {
		const t = Strategy.translate(p.self.centerBearing, 70);
		d.speed = t.speed;
		d.sideSpeed = t.sideSpeed;
	}

	player.name = strategy.name;
	return Strategy.limitToRing(player, d, Strategy.getTacticParams(player).edgeSafety);
}

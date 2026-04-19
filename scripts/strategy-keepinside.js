
	Strategy.keepInsideDrive = function(player, strategy = {
		name: "KEEP INSIDE",
		deltaTurn: 5
	}) {


	// Strategic data stored in player memory.
	const memory = Strategy.getMemory(player, {
		dir: (Math.random() - 0.5) > 0 ? 1 : -1,
		speed: 0
	});


	let d = {speed:0, turn:0};

	const dojoLayer = player.visionLayer[VISION_LAYER.DOJO];



	if (dojoLayer[15].distance < game.dojo.radius / 2) {
		memory.speed *= 0.6;
		d.turn = memory.dir * Math.PI;
	}
	d.speed = memory.speed + 50;

	if (player.energy < 10)
		d.speed *= 0.5;

	memory.speed = d.speed;

	// Save data in memory
	player.memory = memory;

	player.name = strategy.name;

	return { speed: d.speed, turn: d.turn };
}	
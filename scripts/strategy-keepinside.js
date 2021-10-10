
	Strategy.keepInsideDrive = function(player, strategy = {
		name: "KEEP INSIDE",
		deltaTurn: 5
	}) {


	// strategic data to be stored in memory
	let memory = {
		dir: (Math.random()-0.5)>0?1:-1,
		speed: 0
	};

	// read memory data from player
	if (player.memory != null)
		memory = JSON.parse(JSON.stringify(player.memory));


	let d = {speed:0, turn:0};

	let dojoLayer = player.visionLayer[VISION_LAYER.DOJO];



	if (dojoLayer[15].distance < game.dojo.radius/2) {
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
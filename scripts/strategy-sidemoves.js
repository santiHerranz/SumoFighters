
	Strategy.sidemovesDrive = function(player, strategy = {
		name: "SIDE MOVES",
		dojo: game.dojo,
		deltaTurn: 5
	}) {

	// Strategic data stored in player memory.
	const memory = Strategy.getMemory(player, {
		dir: 1
	});

	let d = {
		speed: 0,
		turn: 0,
		sideSpeed: 100 * memory.dir
	};

	if (memory.dir == -1 &&  player.contact.left  )
			memory.dir *= -1;
		else if (memory.dir == 1 && player.contact.right)
			memory.dir *= -1;
		else {
			const dojoLayer = player.visionLayer[VISION_LAYER.DOJO];

			if (memory.dir == -1 &&  dojoLayer[0].distance < 100) memory.dir *= -1;
			else if (memory.dir == 1 &&  dojoLayer[30].distance < 100) memory.dir *= -1;
	
		}



	// Save data in memory
	player.memory = memory;

	player.name = strategy.name;

	return { speed: d.speed, turn: d.turn, sideSpeed: d.sideSpeed };
}	
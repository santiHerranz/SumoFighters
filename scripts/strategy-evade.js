

	Strategy.evadeDrive = function(player, strategy = {
		name: "EVADE",
		dojo: game.dojo,
		deltaTurn: 5
	}) {

	// Strategic data stored in player memory.
	const memory = Strategy.getMemory(player, {
		changeCounts: 0
	});

	let d = {
		speed: 0,
		turn: 0
	};

	let face = Strategy.faceDrive(player);

	d.turn += face.turn;
	d.speed += -10;

	memory.changeCounts++;
	if (memory.changeCounts > 50) {
		d.turn = 1.5;
		d.speed = -30;
	}
	if (player.energy < 75) {
		player.strategyFunc = Strategy.attackDrive;
	}

	// Save data in memory
	player.memory = memory;

	player.name = strategy.name;

	return { speed: d.speed, turn: d.turn };
}	
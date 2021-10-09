
	Strategy.seekDrive = function(player, strategy = {
		name: "SEEK",
		dojo: game.dojo,
		deltaTurn: 5
	}) {

	// strategic data to be stored in memory
	let memory = {
		changeCounts: 0
	};

	// read memory data from player
	if (player.memory != null)
		memory = JSON.parse(JSON.stringify(player.memory));

	let d = {
		speed: 0,
		turn: 0
	};

	let face = Strategy.faceDrive(player, {
		deltaTurn: 5
	});

	d.turn += face.turn;
	d.speed += 100;

	// memory.changeCounts++;
	// if (memory.changeCounts > 50) {
	// 	d.turn = 1.5;
	// 	d.speed = -30;
	// }
	// if (player.energy < 75) {
	// 	player.strategyFunc = Strategy.attackDrive;
	// }

	// Save data in memory
	player.memory = memory;

	player.name = strategy.name;

	return { speed: d.speed, turn: d.turn };
}	
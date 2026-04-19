
	// build a drive controller
	Strategy.attackDrive = function (player, strategy = {
        name: "ATTACK",
        deltaSpeed: 10,
        pushSpeed: 50,
        deltaTurn: 5,
        defaultTurn: 50
    }) {
    let speed = 0, turn = 0;

    const playerLayer = player.visionLayer[VISION_LAYER.PLAYER];
    const middle = playerLayer.length / 2;
    const targetDistance = game.dojo.radius * 2;
    const turnMultiplier = (Math.PI / 180) * strategy.deltaTurn;

    for (let ray of playerLayer) {
        if (ray.point == null || ray.distance >= targetDistance) {
            continue;
        }

        speed += strategy.deltaSpeed;

        // Middle of ray beams.
        const deltaTurn = Math.abs(middle - ray.index); // Right or left?
        const turnDelta = deltaTurn * turnMultiplier;
        if (ray.index < middle) {
            turn -= turnDelta;
        } else if (ray.index > middle) {
            turn += turnDelta;
        }
    }

    if (player.inContact && playerLayer[15].distance < player.radius * 1.2)
        speed += strategy.pushSpeed;



    if (speed == 0 && turn == 0) 
        turn = Math.PI / 180 * strategy.defaultTurn;

    player.name = strategy.name;
    return { speed: speed, turn: turn };
}
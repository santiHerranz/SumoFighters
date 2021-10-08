
	// build a drive controller
	Strategy.attackDrive = function (player, strategy = {
        name: "ATTACK",
        deltaSpeed: 10 + (Math.random() - 0.5),
        deltaTurn: .8,
        defaultTurn: 20
    }) {
    let speed = 0, turn = 0;
    let maxSpeed = 100;
    let playerLayer = player.visionLayer[VISION_LAYER.PLAYER];

    for (let ray of playerLayer) {
        if (ray.point != null) {
            if (ray.distance < game.dojo.radius * 2) {
                speed += strategy.deltaSpeed;
                let middle = playerLayer.length / 2;    // Middle of rays beams
                let deltaTurn = Math.abs(playerLayer.length / 2 - ray.index); // Right or left ?
                if (ray.index < middle)
                    turn += -Math.PI / 180 * deltaTurn * strategy.deltaTurn;
                if (ray.index > middle)
                    turn += Math.PI / 180 * deltaTurn * strategy.deltaTurn;
            }
        }
    }

    if (speed > maxSpeed) speed = maxSpeed;

    if (speed == 0 && turn == 0) 
        turn = Math.PI / 180 * strategy.defaultTurn;

    player.name = strategy.name;
    return { speed: speed, turn: turn };
}
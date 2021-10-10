
// build a drive controller
Strategy.attack2Drive = function (player, strategy = {
        name: "ATTACK 2"
    }) {
    let speed = 0,
    turn = 0;

    // strategic data to be stored in memory
    let memory = {
        state: (Math.random() - 0.5) > 0 ? 'tl' : 'tr',
        counter: Math.round(15 * Math.random()) + 10
    };

    // read memory data from player
    if (player.memory != null)
        memory = JSON.parse(JSON.stringify(player.memory));

    let playerLayer = player.visionLayer[VISION_LAYER.PLAYER];

    let front_left = playerLayer[13].distance < game.dojo.radius;
    let front_right = playerLayer[17].distance < game.dojo.radius;

    switch (memory.state) {
    case 's':
        if (front_left  && front_right ) {
            state = 's';
        } else {
            if (front_left) {
                memory.state = 'tr';
            } else {
                memory.state = 'tl';
            }
            memory.counter = Math.round(10 * Math.random()) + 2;
        }
        break;
    case 'tl':
    case 'tr':
        if (memory.counter > 0) {
            memory.counter--;
        } else {
            memory.state = 's';
        }
        break;
    }

    speed = 50;

    switch (memory.state) {
    case 's':
        // left = speed;
        // right = speed;
        break;
    case 'tr':
        // left = -speed;
        // right = speed;
        turn = -Math.PI/4;
        break;
    case 'tl':
        // left = speed;
        // right = -speed;
        turn = Math.PI/4;
        break;
    }

    // Save data in memory
    player.memory = memory;

    player.name = strategy.name;
    return {
        speed: speed,
        turn: turn
    };
}

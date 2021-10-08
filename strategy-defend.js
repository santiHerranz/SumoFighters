Strategy.defendDrive = function(player, strategy = {
    name: "DEFEND",
    deltaSpeed: 2 + (Math.random() - 0.5),
    deltaTurn: .4
}) {
let speed = 0, turn = 0;

let playerLayer = player.visionLayer[VISION_LAYER.PLAYER];
for (let ray of playerLayer) {
    if (ray.point != null) {
        if (ray.distance < game.dojo.radius * 2) {
            speed += strategy.deltaSpeed;
            let middle = playerLayer.length / 2;
            let deltaTurn = Math.abs(middle - ray.index);
            if (ray.index < middle)
                turn += -Math.PI / 180 * deltaTurn * strategy.deltaTurn;
            if (ray.index > middle)
                turn += Math.PI / 180 * deltaTurn * strategy.deltaTurn;
            if (ray.index > middle-2 && ray.index < middle+2 && player.inContact)
                speed += 30;
        }
    }
}
if (speed == 0 && turn == 0)
    turn = Math.PI / 180 * 50;

player.name = strategy.name;
return { speed: speed, turn: turn };
}
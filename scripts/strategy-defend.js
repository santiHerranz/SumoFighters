Strategy.defendDrive = function(player, strategy = {
    name: "DEFEND",
    deltaSpeed: 2 + (Math.random() - 0.5),
    deltaTurn: .4
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
    const deltaTurn = Math.abs(middle - ray.index);
    const turnDelta = deltaTurn * turnMultiplier;
    if (ray.index < middle) {
        turn -= turnDelta;
    } else if (ray.index > middle) {
        turn += turnDelta;
    }
    if (ray.index > middle - 2 && ray.index < middle + 2 && player.inContact) {
        speed += 30;
    }
}
if (speed == 0 && turn == 0)
    turn = Math.PI / 180 * 50;

player.name = strategy.name;
return { speed: speed, turn: turn };
}
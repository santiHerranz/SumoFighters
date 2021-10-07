Strategy.defendDrive = function(player, strategy = {
    name: "DEFEND",
    deltaSpeed: 2 + (Math.random() - 0.5),
    deltaTurn: .4
}) {
let speed = 0, turn = 0;

let playerLayer = player.visionLayer[VISION_LAYER.PLAYER];
for (let ray of playerLayer) {
    if (ray.point != null) {
        if (ray.distance < dojo.radius * 2) {
            speed += strategy.deltaSpeed;
            let mitad = playerLayer.length / 2;
            let giro = Math.abs(mitad - ray.index);
            if (ray.index < mitad)
                turn += -Math.PI / 180 * giro * strategy.deltaTurn;
            if (ray.index > mitad)
                turn += Math.PI / 180 * giro * strategy.deltaTurn;
            if (ray.index > mitad-2 && ray.index < mitad+2 && player.inContact)
                speed += 30;
        }
    }
}
if (speed == 0 && turn == 0)
    turn = Math.PI / 180 * 50;

player.name = strategy.name;
return { speed: speed, turn: turn };
}
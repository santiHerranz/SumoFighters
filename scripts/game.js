
const GAME_MODE = {
    NONE: 0,
    PLAYERvsCPU: 1,
    CPUvsCPU: 2
}
const GAME_STATUS = {
    GAME_INIT: 0,
    GAME_READY: 1,
    GAME_MENU: 5,
    GAME_PAUSED: 8,
    GAME_RUNNING: 10,
    GAME_GOAL: 20,
    GAME_TIMEOVER: 90,
    ROUND_OVER: 100
};

const BOUNDARY_TYPE = {
    ALL: 0,
    WALL: 1,
    PLAYER: 2,
    DOJO: 3
};

const VISION_LAYER = {
    DOJO: 1,
    PLAYER: 2,
};

class Game {
    constructor() {

        // Some juice
        this.particles = [];
        this.trails = [];
        this.mode = GAME_MODE.NONE;
        this.status = GAME_STATUS.GAME_INIT;

        this.dojo;
        this.players = [];
        this.player_A;
        this.player_B;
        this.player_Dummy;

        this.walls = [];

    }

    prepare() {

        this.players = [];

        let offset = -width;
        this.walls.push(new Boundary(0 + offset, offset, width - offset, offset, BOUNDARY_TYPE.WALL)); // top
        this.walls.push(new Boundary(0 + offset, height - offset, width - offset, height - offset, BOUNDARY_TYPE.WALL)); // bottom
        this.walls.push(new Boundary(offset, offset, offset, height - offset, BOUNDARY_TYPE.WALL)); // left
        this.walls.push(new Boundary(width - offset, offset, width - offset, height - offset, BOUNDARY_TYPE.WALL)); // left


        // Create Dojo
        this.dojo = new Dojo(width / 2, height / 2, 400);
        this.dojo.bgcolor = "rgb(0,0,0,1)";
        this.dojo.walls.forEach(wall => {
            this.walls.push(wall);
        });

        let playerSize = 40;

        // player A
        this.player_A = new Player(width / 2 - 100, height / 2, playerSize);
        this.player_A.strategyFunc = Strategy.randomDrive;
        this.player_A.color = "rgb(0,0,255,0.99)";
        this.player_A.bgcolor = "rgb(0,0,255,0.8)";
        this.player_A.walls.forEach(wall => {
            this.walls.push(wall);
        });
        this.player_A.addListener(this);
        this.players.push(this.player_A);

        if (true) {
            //player B
            this.player_B = new Player(width / 2 + 100, height / 2, playerSize);
            this.player_B.strategyFunc = Strategy.randomDrive;
            this.player_B.color = "rgb(255,0,0,0.99)";
            this.player_B.bgcolor = "rgb(255,0,0,0.8)";
            this.player_B.walls.forEach(wall => {
                this.walls.push(wall);
            });
            this.player_B.addListener(this);
            this.players.push(this.player_B);

        }

        if (false) {
            // Dummy player for test
            this.player_Dummy = new Player(width / 2, height / 2, playerSize);
            this.player_Dummy.strategyFunc = Strategy.IdleDrive;
            // No visible for others
            this.player_Dummy.walls.forEach(wall => {
                this.walls.push(wall);
            });
            this.players.push(this.player_Dummy);
        }
    }

    init() {
        // clear
        this.trails = [];
        this.particles = [];

        // Initial position
        this.player_A.pos.x = width * 5 / 12;
        this.player_A.pos.y = height / 2;
        this.player_A.heading = Math.random() * Math.PI; // convert to radians
        this.player_A.strategyFunc = Strategy.randomDrive;
        if (this.mode == GAME_MODE.PLAYERvsCPU) {
            this.player_A.strategyFunc = Strategy.remoteFacing;
        }
        this.player_A.reset();

        if (this.player_B) {
            this.player_B.pos.x = width * 7 / 12;
            this.player_B.pos.y = height / 2;
            this.player_B.heading = 180 + Math.random() * Math.PI; // convert to radians
            this.player_B.strategyFunc = Strategy.randomDrive;

            this.player_B.reset();
        }

        if (this.player_Dummy) {
            this.player_Dummy.pos.x = width / 2;
            this.player_Dummy.pos.y = height * 1 / 3;
            this.player_Dummy.heading = 90; // convert to radians
            this.player_Dummy.reset();
        }
    }

    step() {

        if (this.status == GAME_STATUS.GAME_RUNNING) {

            // remove death stuff
            this.particles = this.particles.filter(particle => {
                return particle.health > 0
            });
            this.trails = this.trails.filter(trail => {
                return trail.health > 0
            });

            this.players.forEach(player => {
                player.scan(this.walls, BOUNDARY_TYPE.PLAYER, player.visionLayer[VISION_LAYER.PLAYER])
                player.scan(this.walls, BOUNDARY_TYPE.DOJO, player.visionLayer[VISION_LAYER.DOJO])

            });

            this.players.forEach(player => {
                //drive(player, avoidOutRingBackwarsDrive);
                this.drive(player, player.strategyFunc);
            });

            // Avoid same boring strategy
            if (this.players[0].name == "DEFEND" && this.players[1].name == "DEFEND")
                init();
            if (this.players[0].name == "EVADE" && this.players[1].name == "EVADE")
                init();

            // contact
            this.players.forEach(player => {
                player.inContact = false;
            });
            let i = this.players.length;
            while (i--) {
                let dot = this.players[i];
                var j = i;
                if (j > 0) {
                    while (j--) {
                        this.collideAndPush(dot, this.players[j]);
                    }
                }
            }

            this.players.forEach(player => {
                player.step();
            });

            this.particles.forEach(particle => particle.step());
            this.trails.forEach(trail => trail.step());

        }

    }

    draw() {

        this.dojo.draw();

        this.walls.forEach(wall => wall.show());

        this.drawTrails();

        this.players.forEach(player => {
            player.draw();
        });

        this.particles.forEach(particle => particle.draw());

    }

    drawTrails() {

        let blueTrails = this.trails.filter(t => {
            return t.color == this.player_A.color
        });
        let redTrails = [];
        if (this.player_B)
            redTrails = this.trails.filter(t => {
                return t.color == this.player_B.color
            });

        let arrTrails = [blueTrails, redTrails];

        for (let trail of arrTrails) {
            if (showTrails && trail.length > 0) {

                ctx.save();
                ctx.beginPath();
                ctx.lineWidth = trail[0].width;
                ctx.lineCap = 'round';

                ctx.moveTo(trail[0].x, trail[0].y);
                trail.forEach(trail => {
                    ctx.lineTo(trail.x2, trail.y2);
                });

                ctx.strokeStyle = trail[0].color.replace(/[^,]+(?=\))/, '0.3');
                ctx.stroke();

                ctx.restore();
            }
        }

    }

    sparkling(point) {
        for (let index = 0; index < 4; index++) {
            this.particles.push(new Particle(point.x, point.y));
        }
    }

    trailing(emitter, pos, lastPos) {
        this.trails.push(new Trail(pos.x, pos.y, lastPos.x, lastPos.y, emitter.color));
    }

    checkDojoLimits(player, dojo) {
        return !this.dojo.collide(player);

    }

    collide(one, other) {

        var dx = other.pos.x - one.pos.x,
        dy = other.pos.y - one.pos.y,
        dist = Math.sqrt(dx * dx + dy * dy),
        minDist = one.radius + other.radius;
        if (dist < minDist + 10) {
            return true;
        }
        return false;
    }

    collideAndPush(one, other) {

        var dx = other.pos.x - one.pos.x,
        dy = other.pos.y - one.pos.y,
        dist = Math.sqrt(dx * dx + dy * dy),
        minDist = one.radius + other.radius;

        if (dist < minDist) {
            one.inContact = true;
            other.inContact = true;

            // Agressive collission
            // update hit sound
            let speed = one.speed.mag() / deltaTime + other.speed.mag() / deltaTime;
            if (speed > 10) {

                hitSoundTime += speed;
                if (hitSoundTime > 50 / deltaTime) {

                    // add some ssparks at point of collission
                    let point = one.pos.copy().add(Vector.fromAngle(other.pos.copy().sub(one.pos).heading(), other.radius));
                    game.sparkling(point);

                    hitSoundTime = 0;
                    playSound("HIT");

                }
            } else
                hitSoundTime = .5;

            var tx = one.pos.x + dx / dist * minDist,
            ty = one.pos.y + dy / dist * minDist,
            ax = (tx - other.pos.x),
            ay = (ty - other.pos.y);

            const K = 0.9;

            one.pos.x -= ax * K;
            one.pos.y -= ay * K;
            other.pos.x += ax * K;
            other.pos.y += ay * K;

        }

    }

    drive(player, func) {

        let d = func(player);

        if (d.speed > player.maxSpeed)
            d.speed = player.maxSpeed;
        if (d.turn > player.maxTurn)
            d.turn = player.maxTurn;

        // Apply
        player.move(d.speed);
        player.rotate(d.turn);
    }

    mouseDownEvent(position) {
        mouseLeftPressed = true;

        if (this.player_Dummy) {
            this.player_Dummy.pos.x = position.x;
            this.player_Dummy.pos.y = position.y;
        }
    }

    mouseMoveEvent(position) {

        if (mouseLeftPressed == true) {
            if (this.player_Dummy) {
                this.player_Dummy.pos.x = position.x;
                this.player_Dummy.pos.y = position.y;
            }
        }
    }

    mouseUpEvent(position) {

        if (this.player_Dummy) {
            this.player_Dummy.pos.x = position.x;
            this.player_Dummy.pos.y = position.y;
        }
        mouseLeftPressed = false;

    }

}

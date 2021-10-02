

class Player {
	constructor(x, y, r) {

		this.bgcolor = "white";
		this.color = "black";
		this.radius = r;

		this.vx = 0;
		this.vy = 0;

		this.health = 100;
		this.energy = 100;

		this.clicked = false;
		this.inCollision = false;

		this.sx = 0;
		this.sy = 0;

		this.pos = createVector(x, y);

		this.heading = Math.PI * 2;

		this.walls = [];
		this.offset = this.radius;
		this.walls.push(new Boundary(this.pos.x, this.pos.y - this.offset, this.pos.x, this.pos.y + this.offset)); // vertical
		this.walls.push(new Boundary(this.pos.x - this.offset, this.pos.y, this.pos.x + this.offset, this.pos.y)); // horizontal


		this.showRays = false;
		this.fieldOfView = 120;
		//    this.rayCount = this.fieldOfView / 6;
		this.rayCount = this.fieldOfView / 30;

		this.rays = [];
		this.vision = [];


		// this.rays.push(new Ray(this.pos, radians(0), 0));
		// this.rays.push(new Ray(this.pos, radians(-20), -1));
		// this.rays.push(new Ray(this.pos, radians(+20), 1));
		for (let a = -this.fieldOfView / 2; a <= this.fieldOfView / 2; a += this.rayCount) {
			this.rays.push(new Ray(this.pos, radians(a)));
		}

	}

	step() {

		let wall = this.walls[0];
		wall.a.x = this.pos.x;
		wall.a.y = this.pos.y - this.offset;
		wall.b.x = this.pos.x;
		wall.b.y = this.pos.y + this.offset;

		wall = this.walls[1];
		wall.a.x = this.pos.x - this.offset;
		wall.a.y = this.pos.y;
		wall.b.x = this.pos.x + this.offset;
		wall.b.y = this.pos.y;

	}

	draw() {


		// Body
		ctx.fillStyle = this.bgcolor;
		ctx.strokeStyle = this.color;
		ctx.beginPath();
		ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();

		// Heading line
		ctx.save();
		ctx.lineWidth = 4;
		ctx.strokeStyle = "rgb(255,255,255,0.9)";
		ctx.beginPath();
		ctx.moveTo(this.pos.x, this.pos.y);
		ctx.lineTo(this.pos.x + this.radius * Math.cos(this.heading + Math.PI + radians(180)), this.pos.y + this.radius * Math.sin(this.heading + Math.PI + radians(180)));
		ctx.stroke();
		ctx.restore();

		// Ray
		if (this.showRays) {
			for (let ray of this.vision) {
				if (ray.point != null) {

					if (ray.distance < 300)
						ctx.strokeStyle = "#f00";
					else
						ctx.strokeStyle = ray.color;

				}
				ctx.beginPath();
				ctx.moveTo(this.pos.x, this.pos.y);
				ctx.lineTo(ray.point.x, ray.point.y);
				ctx.stroke();

			}

		}
	}

	rotate(angle) {

		this.energy -= 0.1;

		this.heading += angle;
		let index = 0;
		for (let a = -this.fieldOfView / 2; a <= this.fieldOfView / 2; a += this.rayCount) {
			this.rays[index].setAngle(radians(a) + this.heading);
			index++;
		}
		// this.rays[0].setAngle(radians(0) + this.heading);
		// this.rays[1].setAngle(radians(-20) + this.heading);
		// this.rays[2].setAngle(radians(+20) + this.heading);
	}

	move(amt) {
		this.energy -= 0.1;

		const vel = Vector.fromAngle(this.heading, amt);
		this.pos.add(vel);
	}

	sideMove(amt) {
		this.energy -= 0.1;

		const vel = Vector.fromAngle(this.heading + Math.PI / 2, amt);
		this.pos.add(vel);
	}

	update(position) {
		this.pos.set(position.x, position.y);
	}

	scan(walls) {

		for (let i = 0; i < this.rays.length; i++) {
			const ray = this.rays[i];
			let closest = null;
			let record = Infinity;

			//
			for (let wall of walls) {
				const pt = ray.cast(wall);
				if (pt) {
					let d = Vector.dist(this.pos, pt);
					if (d < record) {
						record = d;
						closest = pt;
					}
				}
			}

			this.vision[i] = {
				index: i,
				dir: ray.dir,
				point: closest,
				distance: record,
				color: "rgb(255,255,255,0.1)",
				colorActive: "rgb(255,255,255,0.6)"
			};

		}
	}



	collide(other) {

		var dx = other.pos.x - this.pos.x,
		dy = other.pos.y - this.pos.y,
		dist = Math.sqrt(dx * dx + dy * dy),
		minDist = this.radius + other.radius;
		return (dist < minDist);
	}

	distanceTo(other) {

		var dx = other.pos.x - this.pos.x,
		dy = other.pos.y - this.pos.y,
		dist = Math.sqrt(dx * dx + dy * dy);
		return dist;
	}

}

function radians(value) {
	return Math.PI / 180 * value;
}

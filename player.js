

class Player {
	constructor(x, y, r) {

		this.bgcolor = "white";
		this.color = "white";
		this.radius = r;

		this.health = 100;
		this.energy = 100;

		this.pos = createVector(x, y);

		this.heading = 0;

		this.walls = [];
		this.offset = this.radius;
		this.walls.push(new Boundary(this.pos.x, this.pos.y - this.offset, this.pos.x, this.pos.y + this.offset)); // vertical
		this.walls.push(new Boundary(this.pos.x - this.offset, this.pos.y, this.pos.x + this.offset, this.pos.y)); // horizontal


		this.fieldOfView = 120;
		this.rayCount = 30;
		this.halfFieldOfView = this.fieldOfView / 2;
		this.deltaFieldOfView = this.fieldOfView / this.rayCount;
		//this.rayCount = this.fieldOfView / 30;

		this.rays = [];
		this.vision = [];

		// this.rays.push(new Ray(this.pos, radians(0), 0));
		// this.rays.push(new Ray(this.pos, radians(-20), -1));
		// this.rays.push(new Ray(this.pos, radians(+20), 1));
		for (let a = -this.halfFieldOfView; a <= this.halfFieldOfView; a += this.deltaFieldOfView) {
			this.rays.push(new Ray(this.pos, radians(a)));
		}

		this.showRays = showRays;
		this.showLifeIndicator = true;

	}

	step() {
		this.showRays = showRays;

		// Move boundaries as body moves
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
		ctx.lineWidth = 4;
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

		// Life indicator
		if (this.showLifeIndicator) {
			let offset = this.radius * 0.8;
			ctx.save();
			ctx.strokeStyle = "#ffcccc";
			ctx.lineWidth = 8;
			ctx.translate(this.pos.x, this.pos.y);
			ctx.rotate(this.heading - Math.PI / 2);



			ctx.beginPath();
			ctx.moveTo(0 - 10, 0 - offset);
			ctx.lineTo(0 + 10, 0 - offset);
			ctx.stroke();

			ctx.beginPath();
			ctx.strokeStyle = "#00ff00";
			ctx.lineWidth = 10;
			ctx.moveTo(0 - 10, 0 - offset);
			ctx.lineTo(0 - 10 + 20 * (this.energy / 100.0), 0 - offset);
			ctx.stroke();


			ctx.rotate(Math.PI);
			ctx.font = 'bold 10px verdana';
			ctx.fillStyle = 'white';
	
			var title = this.name;
			var size = ctx.measureText(title);
			var x = 0 - size.width / 2;
			var y = 0 + this.radius/2;
			ctx.fillText(title, x, y);			

			ctx.restore();
		}

		// Ray
		if (this.showRays) {
			ctx.lineWidth = 1.5;

			for (let ray of this.vision) {
				if (ray.point != null) {

					if (ray.distance < 300)
						ctx.strokeStyle = "rgb(255,255,0,0.6)"
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

		if (this.energy <= 0)
			return;

		this.heading += deltaTime*angle;
		let index = 0;
		for (let a = -this.fieldOfView / 2; a <= this.fieldOfView / 2; a += this.deltaFieldOfView) {
			this.rays[index].setAngle(radians(a) + this.heading);
			index++;
		}
		// this.rays[0].setAngle(radians(0) + this.heading);
		// this.rays[1].setAngle(radians(-20) + this.heading);
		// this.rays[2].setAngle(radians(+20) + this.heading);

		this.energy -= deltaTime*0.1;
	}

	move(amt) {

		if (this.energy <= 0)
			return;

		const vel = Vector.fromAngle(this.heading, deltaTime*amt);
		this.pos.add(vel);

		this.energy -= deltaTime*0.1;

	}

	sideMove(amt) {
		if (this.energy <= 0)
			return;

		const vel = Vector.fromAngle(this.heading + Math.PI / 2, deltaTime*amt);
		this.pos.add(vel);

		this.energy -= deltaTime*0.1;
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

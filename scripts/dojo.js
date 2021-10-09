

class Dojo {
	constructor(x, y, r) {

		this.pos = createVector(x, y);

		this.radius = r;
		this.border = 20;

		this.inCollision = false;

		this.owner = null;

		this.walls = [];
		// this.offset = this.radius;
		// this.walls.push(new Boundary(this.pos.x, this.pos.y - this.offset, this.pos.x, this.pos.y + this.offset)); // vertical
		// this.walls.push(new Boundary(this.pos.x - this.offset, this.pos.y, this.pos.x + this.offset, this.pos.y)); // horizontal


		// Add Boundaries
		let points = [];
		var n_number = 50;
		var n_angles = 2 * Math.PI / n_number
		let legalRadius =  this.radius-20;
		for (let i = 0; i < n_number; i++) {
			let x = this.pos.x + legalRadius * Math.cos(i * n_angles);
			let y = this.pos.y + legalRadius * Math.sin(i * n_angles);
			points.push({
				x: x,
				y: y
			});
		}
		x = this.pos.x + legalRadius * Math.cos(0);
		y = this.pos.y + legalRadius * Math.sin(0);
		points.push({
			x: x,
			y: y
		});

		let lastPoint = points[0];
		for (let i = 1; i < points.length; i++) {
			this.walls.push(new Boundary(lastPoint.x, lastPoint.y, points[i].x, points[i].y, BOUNDARY_TYPE.DOJO)); // perimeter
			lastPoint = points[i];
		}
		this.walls.push(new Boundary(lastPoint.x, lastPoint.y, points[points.length - 1].x, points[points.length - 1].y, BOUNDARY_TYPE.DOJO)); // perimeter


	}

	step() {}

	draw() {

		// White
		ctx.fillStyle = "rgb(255,255,255,0.9)";
		ctx.beginPath();
		ctx.arc(this.pos.x, this.pos.y, this.radius, 0, 2 * Math.PI);
		ctx.closePath();
		ctx.fill();

		// Black
		ctx.fillStyle = "rgb(0,0,0,0.9)";
		ctx.beginPath();
		ctx.arc(this.pos.x, this.pos.y, this.radius - this.border, 0, 2 * Math.PI);
		ctx.closePath();
		ctx.fill();
		
		// Brown Starting lines (Shikiri-sen)
		ctx.save()
		ctx.strokeStyle = "rgb(92, 61, 46, 0.8)";
		ctx.lineWidth = 10;
		ctx.translate(this.pos.x, this.pos.y);

		ctx.beginPath();
		ctx.moveTo(-50, -40);
		ctx.lineTo(-50, +40);
		ctx.closePath();
		ctx.stroke();

		ctx.beginPath();
		ctx.moveTo(+50, -40);
		ctx.lineTo(+50, +40);
		ctx.closePath();
		ctx.stroke();
		ctx.restore();

	}

	collide( other ) {

		var dx = other.pos.x - this.pos.x,
		dy = other.pos.y - this.pos.y,
		dist = Math.sqrt( dx * dx + dy * dy ),
		minDist = this.radius + other.radius;
		return ( dist < minDist );
	}


}

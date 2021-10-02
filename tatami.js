

class Tatami {
	constructor(x,y) {

		this.bgcolor = "white";
		this.color = "yellow";

		this.pos = createVector(x, y);

		this.radius = 10;

		this.vx = 0;
		this.vy = 0;

		this.health = 100;

		this.clicked = false;

		this.inCollision = false;

		this.owner = null;

	}


	step() {


	}

	draw() {

		ctx.globalAlpha = 0.9;
		ctx.beginPath();
		ctx.strokeStyle = "rgb(0,0,0,0.9)";
		ctx.arc(width/2, height/2, 250,0,2*Math.PI);
		ctx.closePath();
		ctx.stroke();
		ctx.fillStyle = "rgb(255,255,255,0.9)";
		ctx.fill();

		ctx.strokeStyle = this.color;

		ctx.beginPath();


		ctx.strokeStyle = this.bgcolor;
		ctx.arc(this.pos.x, this.pos.y, this.radius, 0, 2 * Math.PI);
		ctx.stroke();

		ctx.fillStyle = this.bgcolor;
		ctx.fill();


	}


	collide( other ) {

		var dx = other.pos.x - this.pos.x,
		dy = other.pos.y - this.pos.y,
		dist = Math.sqrt( dx * dx + dy * dy ),
		minDist = this.radius + other.radius;
		return ( dist < minDist );
	}

}



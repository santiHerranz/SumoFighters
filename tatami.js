

class Tatami {
	constructor(x,y,r) {

		this.bgcolor = "white";
		this.color = "yellow";

		this.pos = createVector(x, y);

		this.radius = r;
		this.border = 20;
		
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

		ctx.fillStyle = "rgb(255,255,255,0.9)";
		ctx.globalAlpha = 0.9;
		ctx.beginPath();
		ctx.arc(this.pos.x, this.pos.y, this.radius+this.border,0,2*Math.PI);
		ctx.closePath();
		ctx.fill();

		ctx.strokeStyle = this.bgcolor;
		ctx.fillStyle = this.bgcolor;

		ctx.beginPath();
		ctx.arc(this.pos.x, this.pos.y, this.radius, 0, 2 * Math.PI);
		ctx.closePath();
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



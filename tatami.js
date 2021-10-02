

class Tatami {
	constructor(x,y,r) {

		this.bgcolor = "white";
		this.color = "yellow";

		this.pos = createVector(x, y);

		this.radius = r;
		this.border = 20;

		this.inCollision = false;

		this.owner = null;


		this.walls = [];
		this.offset = this.radius;
		this.walls.push(new Boundary(this.pos.x, this.pos.y - this.offset, this.pos.x, this.pos.y + this.offset)); // vertical
		this.walls.push(new Boundary(this.pos.x - this.offset, this.pos.y, this.pos.x + this.offset, this.pos.y)); // horizontal


	}


	step() {


	}

	draw() {

		ctx.fillStyle = "rgb(255,255,255,0.9)";
//		ctx.globalAlpha = 0.9;
		ctx.beginPath();
		ctx.arc(this.pos.x, this.pos.y, this.radius,0,2*Math.PI);
		ctx.closePath();
		ctx.fill();

		ctx.strokeStyle = this.bgcolor;
		ctx.fillStyle = this.bgcolor;

		ctx.beginPath();
		ctx.arc(this.pos.x, this.pos.y, this.radius-this.border, 0, 2 * Math.PI);
		ctx.closePath();
		ctx.fill();

		// Player Lines 
		ctx.save()
		ctx.strokeStyle = "rgb(255,255,255,1)";
		ctx.lineWidth = 10;
		ctx.translate(this.pos.x,this.pos.y);
		ctx.moveTo(-50,-40);
		ctx.lineTo(-50,+40);
		ctx.stroke();
		ctx.moveTo(+50,-40);
		ctx.lineTo(+50,+40);
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



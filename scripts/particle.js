

function Particle(x,y) {

	this.x = x;
	this.y = y;
	this.radius = 1;

	this.vx = 120 * (Math.random() - 0.5);
	this.vy = 120 * (Math.random() - 0.5);

	this.color = "yellow";
	this.health = 100;
}



Particle.prototype.step = function() {

	// friction
	this.vx *= 0.99;
	 this.vy *= 0.99;

	// apply forces	
	this.x += this.vx*deltaTime;
	this.y += this.vy*deltaTime;

	this.health -= deltaTime*50;

}

Particle.prototype.draw = function() {

	ctx.save();
	ctx.beginPath();
	ctx.arc( this.x, this.y, this.radius, 0, Math.PI*2 );
	ctx.closePath();
	ctx.fillStyle = this.color;
	ctx.fill();
	ctx.restore();
}


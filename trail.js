

function Trail(x,y, color) {

	this.x = x;
	this.y = y;
	this.radius = 4;

	this.vx = 100 * (Math.random() - 0.5);
	this.vy = 100 * (Math.random() - 0.5);

	this.color = color;
	this.health = 100;
}



Trail.prototype.step = function() {
	this.health -= deltaTime*1;
}

Trail.prototype.draw = function() {

	ctx.save();
	ctx.beginPath();
	ctx.arc( this.x, this.y, this.radius, 0, Math.PI*2 );
	ctx.closePath();
	ctx.fillStyle = this.color.replace(/[^,]+(?=\))/, '0.2');
	ctx.fill();
	ctx.restore();
}


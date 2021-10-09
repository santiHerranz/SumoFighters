

function Trail(x, y, x2, y2, color, width = 20) {

	this.x = x;
	this.y = y;
	this.x2 = x2;
	this.y2 = y2;
	this.radius = 4;
	this.width = width;

	this.vx = 100 * (Math.random() - 0.5);
	this.vy = 100 * (Math.random() - 0.5);

	this.color = color;
	this.health = 10;
}

Trail.prototype.step = function () {
	this.health -= deltaTime * 0.5;
}

Trail.prototype.draw = function () {

	if (showTrails) {

		ctx.save();
		ctx.beginPath();
		ctx.lineWidth = this.width;
		ctx.lineCap = 'round';
				// ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
		ctx.moveTo(this.x,this.y);
		ctx.lineTo(this.x2,this.y2);
		ctx.closePath();
		ctx.strokeStyle = this.color.replace(/[^,]+(?=\))/, '0.4');
		ctx.stroke();
		ctx.fillStyle = this.color.replace(/[^,]+(?=\))/, '0.4');
		ctx.fill();
		ctx.restore();
	}
}

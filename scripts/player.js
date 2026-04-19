

class Player {
	constructor(x, y, r) {

		this.bgcolor = "white";
		this.color = "white";
		this.radius = r;

		this.health = 100;
		this.energy = 100;

		this.pos = createVector(x, y);
		this.lastPos = this.pos.copy();

		// Limits
		this.maxTurn = Math.PI / 180 * 120;
		this.maxSpeed = 1000;

		this.speed = createVector(0, 0); // current speed
		this.distance = 0;

		this.heading = 0;

		this.inContact = false;
		this.contactPoint = null;
		this.contact = {
			heading: 0,
			top: 0,
			bottom: 0,
			left: 0,
			right: 0
		};
		this.contactTimer = 0;

		this.strategyFunc = Strategy.IdleDrive;
		this.memory = null; // {distance:0, dir:1};
		this.fsm = {
			enabled: true,
			currentState: null,
			lastReason: "INIT",
			ticksInState: 0,
			noProgressTicks: 0,
			lastDistance: 0,
			lastSignals: null,
		};


		this.fieldOfView = 120;
		this.rayCount = 30;
		this.halfFieldOfView = this.fieldOfView / 2;
		this.deltaFieldOfView = this.fieldOfView / this.rayCount;
		//this.rayCount = this.fieldOfView / 30;

		this.rays = [];
		this.rayBaseAngles = [];
		this.visionLayer = [];
		this.visionLayer[VISION_LAYER.DOJO] = [];
		this.visionLayer[VISION_LAYER.PLAYER] = [];

		for (let a = -this.halfFieldOfView; a <= this.halfFieldOfView; a += this.deltaFieldOfView) {
			const baseAngle = radians(a);
			this.rayBaseAngles.push(baseAngle);
			this.rays.push(new Ray(this.pos, baseAngle, BOUNDARY_TYPE.PLAYER));
		}

		this.walls = [];
		// These walls do not interfere with your own beam.
		this.offset = this.radius;
		this.walls.push(new Boundary(this.pos.x, this.pos.y - this.offset, this.pos.x, this.pos.y + this.offset, BOUNDARY_TYPE.PLAYER)); // vertical
		this.walls.push(new Boundary(this.pos.x - this.offset, this.pos.y, this.pos.x + this.offset, this.pos.y, BOUNDARY_TYPE.PLAYER)); // horizontal


		this.showRays = showRays;
		this.showEnergyIndicator = true;

		this.stepPos = this.pos.copy();
		this.lastTrailPos = this.pos.copy();
		this.trailDistance = 0;
		this.trailMinDistance = 10;

		this.listeners = [];

	}

	addListener(listener) {
		this.listeners.push(listener);
	}

	trailing(pos, lastPos) {
		this.listeners.forEach(listener => {
			listener.trailing(this, pos, lastPos);
		});
	}

	reset() {

		// Initial energy
		this.energy = 100;

		this.memory = null;
		this.fsm.currentState = null;
		this.fsm.lastReason = "RESET";
		this.fsm.ticksInState = 0;
		this.fsm.noProgressTicks = 0;
		this.fsm.lastDistance = this.distance;
		this.fsm.lastSignals = null;

		this.lastTrailPos = this.pos.copy();

	}

	getInfo() {
		return {
			pos: {
				x: this.pos.x.toFixed(0),
				y: this.pos.y.toFixed(0)
			},
			speed: this.speed.mag().toFixed(2),
			angle: this.heading.toFixed(2),
			//contactHeading: this.contact.heading.toFixed(2),
			contact: "t"+ this.contact.top +"-l"+ this.contact.left +"-r"+ this.contact.right +"-b"+ this.contact.bottom,
			energy: this.energy.toFixed(0),
			distance: this.distance.toFixed(0),
			memory: this.memory,
			fsm: {
				enabled: this.fsm.enabled,
				state: this.fsm.currentState,
				reason: this.fsm.lastReason,
				signals: this.fsm.lastSignals
			}
		};
	}

	drive() {

		let d = this.strategyFunc(this);

		if (d.speed > this.maxSpeed)
			d.speed = this.maxSpeed;
		if (d.turn > this.maxTurn)
			d.turn = this.maxTurn;

		// Apply
		this.move(d.speed);
		this.rotate(d.turn);
		if (d.sideSpeed)
			this.sideMove(d.sideSpeed);
	}

	hit(point) {

		if (this.contactTimer == 0) {
			this.inContact = true;
			this.contactPoint = point;
			this.contactTimer = 20;
		}
	}

	step() {

		if (this.contactTimer > 0)
			this.contactTimer--;
		else {
			this.inContact = false;
			this.contactPoint = null;
			this.contact.heading = 0;
			this.contact.top = 0;
			this.contact.bottom = 0;
			this.contact.left = 0;
			this.contact.right = 0;
		}

		// force 360
		//this.heading = (this.heading + Math.PI*2) % Math.PI*2;

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

		// decode contact point into self reference sides
		if (this.inContact && this.contactPoint != null) {

			const vectorContactX = this.pos.x - this.contactPoint.x;
			const vectorContactY = this.pos.y - this.contactPoint.y;
			this.contact.heading = Math.atan2(vectorContactY, vectorContactX);
			const headingDiff = this.heading - this.contact.heading;
			let angle = 180 + headingDiff * 180 / Math.PI;

			angle = (angle + 360) % 360;

			this.contact.top = 360 - 45 < angle && angle < 360 || 0 < angle && angle < 45 ? 1 : 0;
			this.contact.left = 45 < angle && angle < 90 + 45 ? 1 : 0;
			this.contact.bottom = 90 + 45 < angle && angle < 180 + 45 ? 1 : 0;
			this.contact.right = 180 + 45 < angle && angle < 270 + 45 ? 1 : 0;

		} 

		// Calculate distance between two steps and trail if is
		const stepDx = this.pos.x - this.stepPos.x;
		const stepDy = this.pos.y - this.stepPos.y;
		const d = Math.sqrt(stepDx * stepDx + stepDy * stepDy);

		if (this.trailDistance > this.trailMinDistance) {
			this.trailing(this.lastTrailPos, this.pos);
			this.lastTrailPos.set(this.pos.x, this.pos.y, this.pos.z);
			this.trailDistance = 0;
		} else
			this.trailDistance += d;

		this.stepPos.set(this.pos.x, this.pos.y, this.pos.z);

	}

	draw() {

		// Ray
		if (this.showRays) {
			ctx.lineWidth = 1.5;

			for (let ray of this.visionLayer[VISION_LAYER.PLAYER]) {
				if (ray.point != null) {

					if (ray.distance < 300)
						ctx.strokeStyle = "rgb(255,255,0,0.6)";
					else
						ctx.strokeStyle = ray.color;

					ctx.beginPath();
					ctx.moveTo(this.pos.x, this.pos.y);
					ctx.lineTo(ray.point.x, ray.point.y);
					ctx.stroke();
				}

			}

			for (let ray of this.visionLayer[VISION_LAYER.DOJO]) {
				if (ray.point != null) {

					if (ray.distance < 300)
						ctx.strokeStyle = "rgb(255,0,0,0.6)";
					else
						ctx.strokeStyle = ray.color;

					ctx.beginPath();
					ctx.moveTo(this.pos.x, this.pos.y);
					ctx.lineTo(ray.point.x, ray.point.y);
					ctx.stroke();
				}

			}

		}

		// Body
		ctx.fillStyle = this.bgcolor;
		ctx.strokeStyle = this.color;

		ctx.lineWidth = 1; //this.inContact?6:2;
		ctx.beginPath();
		ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();


		// Contac body section
		ctx.lineWidth = 6;
		ctx.strokeStyle = "rgb(255,255,0,0.8)";

		if (this.contact.top) {
			ctx.beginPath();
			ctx.arc(this.pos.x, this.pos.y, this.radius, this.heading - Math.PI / 4, this.heading + Math.PI / 4);
			ctx.stroke();
		}
		if (this.contact.right) {
			ctx.beginPath();
			ctx.arc(this.pos.x, this.pos.y, this.radius, Math.PI / 2 + this.heading - Math.PI / 4, Math.PI / 2 + this.heading + Math.PI / 4);
			ctx.stroke();
		}
		if (this.contact.bottom) {
			ctx.beginPath();
			ctx.arc(this.pos.x, this.pos.y, this.radius, Math.PI + this.heading - Math.PI / 4, Math.PI + this.heading + Math.PI / 4);
			ctx.stroke();
		}

		if (this.contact.left) {
			ctx.beginPath();
			ctx.arc(this.pos.x, this.pos.y, this.radius, Math.PI * 3 / 2 + this.heading - Math.PI / 4, Math.PI * 3 / 2 + this.heading + Math.PI / 4);
			ctx.stroke();
		}

		// Contact point
		// if (this.contactPoint != null) {
		// 	ctx.lineWidth = 1;
		// 	ctx.beginPath();
		// 	ctx.arc(this.contactPoint.x, this.contactPoint.y, 20, 0, Math.PI * 2);
		// 	ctx.closePath();
		// 	ctx.strokeStyle = "rgb(255,255,255,0.9)";
		// 	ctx.stroke();
		// }

		// Heading line
		let maxL = this.radius;
		ctx.save();
		ctx.lineWidth = 4;
		ctx.strokeStyle = "rgb(255,255,255,0.9)";
		ctx.beginPath();
		ctx.moveTo(this.pos.x, this.pos.y);
		ctx.lineTo(this.pos.x + maxL * Math.cos(this.heading + Math.PI + radians(180)), this.pos.y + maxL * Math.sin(this.heading + Math.PI + radians(180)));
		ctx.closePath();
		ctx.stroke();

		// Energy indicator
		if (this.showEnergyIndicator) {

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
			ctx.shadowColor = "black";
			ctx.shadowBlur = 3;
			ctx.fillStyle = 'white';

			var title = this.name;
			var size = ctx.measureText(title);
			var x = 0 - size.width / 2;
			var y = 0 + this.radius / 2;
			ctx.fillText(title, x, y);

			ctx.restore();
		}

	}

	rotate(angle) {

		if (this.energy <= 0)
			return;

		this.heading += deltaTime * angle;
		for (let i = 0; i < this.rays.length; i++) {
			this.rays[i].setAngle(this.rayBaseAngles[i] + this.heading);
		}

		// Energy cost for rotate
		if (angle != 0)
			this.energy -= deltaTime * 0.01;
	}

	move(amt) {

		if (this.energy <= 0) {
			return;
		}

		this.lastPos.set(this.pos.x, this.pos.y, this.pos.z);

		const vel = Vector.fromAngle(this.heading, deltaTime * amt);
		this.speed = vel;
		this.pos.add(vel);

		const d = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
		this.distance += d;

		// energy cost of move
		this.energy -= d * deltaTime *0.1;
	}

	sideMove(amt) {
		if (this.energy <= 0)
			return;

		this.lastPos.set(this.pos.x, this.pos.y, this.pos.z);

		const vel = Vector.fromAngle(this.heading + Math.PI / 2, deltaTime * amt);
		this.speed = vel;
		this.pos.add(this.speed);

		const d = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
		this.distance += d;		

		// energy cost of side move
		this.energy -= d * deltaTime *0.1;
	}

	update(position) {
		this.pos.set(position.x, position.y);
	}

	// Snapshot the pre-tick pose so the renderer can interpolate between
	// consecutive simulation states at any time scale (see app.js).
	captureRenderPrev() {
		if (!this._renderPrev) {
			this._renderPrev = { x: 0, y: 0, heading: 0 };
		}
		this._renderPrev.x = this.pos.x;
		this._renderPrev.y = this.pos.y;
		this._renderPrev.heading = this.heading;
		this._hasRenderPrev = true;
	}

	scan(boundaries, type, layer) {
		const scanBoundaries = type == BOUNDARY_TYPE.ALL ? boundaries : boundaries.filter(b => b.type == type);

		for (let i = 0; i < this.rays.length; i++) {
			const ray = this.rays[i];
			let closest = null;
			let recordSq = Infinity;

			for (let wall of scanBoundaries) {
				const pt = ray.cast(wall);
				if (pt) {
					const dx = pt.x - this.pos.x;
					const dy = pt.y - this.pos.y;
					const dSq = dx * dx + dy * dy;
					if (dSq < recordSq) {
						recordSq = dSq;
						closest = pt;
					}
				}
			}

			const rayData = layer[i] || (layer[i] = {
				index: i,
				dir: ray.dir,
				point: null,
				distance: Infinity,
				color: "rgb(255,255,255,0.1)",
				colorActive: "rgb(255,255,255,0.6)",
				type: type
			});
			rayData.index = i;
			rayData.dir = ray.dir;
			rayData.point = closest;
			rayData.distance = recordSq === Infinity ? Infinity : Math.sqrt(recordSq);
			rayData.type = type;

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

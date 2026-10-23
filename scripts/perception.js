// Robot perception: turns the raw sensors (ray layers, bumper, heading, energy and
// match clock) into a small world model shared by the adaptive brain and the new
// tactics. It only uses what a real sumo robot could sense:
//  - self localisation: fit the ring circle to the dojo-layer ray hits
//  - enemy: bearing/distance from player-layer hits, tracked in the ring frame
//  - memory: last seen position, velocity, idle time, estimated enemy energy
//  - opponent model: how aggressive it is and who wins the head-on pushes

const PERCEPTION = {
	FIT_ITERATIONS: 4,
	FIT_MAX_RMS: 4,           // px, worse ring fits are rejected
	TRACK_ALPHA: 0.5,         // alpha-beta tracker gains for the enemy position
	TRACK_BETA: 0.15,
	IDLE_SPEED: 1.2,          // px/tick under which the enemy counts as stopped
	MODEL_SMOOTHING: 0.04,    // EMA factor for the opponent model
	CHARGE_SPEED: 7,          // px/tick towards us that counts as a charge
	FRONT_CONTACT: Math.PI / 180 * 50,
	BACK_CONTACT: Math.PI / 180 * 130,
};

class Perception {

	static create(prior) {
		return {
			tick: 0,
			origin: { x: 0, y: 0 },         // where the body was when sensing (debug overlay only)
			self: {
				localized: false,
				fitAge: 0,                  // ticks since the last good ring fit
				pos: { x: 0, y: 0 },        // relative to the ring centre, world axes
				distCenter: 0,
				edgeMargin: Infinity,       // px left before the ring-out distance
				centerBearing: 0,           // relative to heading, negative = left
				edgeAhead: Infinity,
				edgeBehind: Infinity,
				edgeLeft: Infinity,
				edgeRight: Infinity,
				radialSpeed: 0,             // px/tick, positive = drifting outwards
				energySpent: 0,             // this tick
				prevEnergy: null,
			},
			enemy: {
				visible: false,
				clipped: false,             // touching the edge of the field of view
				bearing: 0,
				distance: Infinity,         // centre to centre (estimated)
				pos: null,                  // smoothed, ring frame
				vel: { x: 0, y: 0 },        // px/tick
				towardUs: 0,                // px/tick of its velocity aimed at us
				edgeMargin: Infinity,
				ticksUnseen: Infinity,
				lastSeenWorldBearing: null,
				predictedBearing: null,
				refuted: false,             // looked where it should be and it was not there
				idleTicks: 0,
				energyEst: 100,
				spendRate: 0.05,            // energy/tick, used while unseen
			},
			contact: {
				active: false,
				bearing: 0,
				front: false,
				side: false,
				back: false,
				ticks: 0,
				advance: 0,                 // px/tick we move forward while pushing
				stalledTicks: 0,            // frontal shove that goes nowhere
			},
			model: {
				aggression: prior ? prior.aggression : 0.3,
				pushBalance: prior ? prior.pushBalance : 0,
				charges: 0,
			},
			clock: { elapsed: 0, remaining: 1 },
		};
	}

	static reset(player, prior) {
		player.perception = Perception.create(prior);
	}

	static normalizeAngle(a) {
		while (a > Math.PI) a -= Math.PI * 2;
		while (a < -Math.PI) a += Math.PI * 2;
		return a;
	}

	// Distance from (px, py) along angle to the circle of radius r centred at the origin.
	static distanceToCircle(px, py, angle, r) {
		const dx = Math.cos(angle);
		const dy = Math.sin(angle);
		const b = px * dx + py * dy;
		const c = px * px + py * py - r * r;
		const disc = b * b - c;
		if (disc < 0) return 0;
		return Math.max(0, -b + Math.sqrt(disc));
	}

	static update(player) {
		if (player.perception == null) Perception.reset(player);
		const p = player.perception;
		p.tick++;
		p.origin.x = player.pos.x;
		p.origin.y = player.pos.y;

		const s = p.self;
		s.energySpent = s.prevEnergy == null ? 0 : Math.max(0, s.prevEnergy - player.energy);
		s.prevEnergy = player.energy;

		p.clock.elapsed = game.matchTime;
		p.clock.remaining = Math.max(0, 1 - game.matchTime / MATCH_DURATION_SECONDS);

		const prevPos = s.localized ? { x: s.pos.x, y: s.pos.y } : null;
		Perception.localize(player, p);
		Perception.senseContact(player, p, prevPos);
		Perception.trackEnemy(player, p);
	}

	// Self localisation: the dojo-layer rays always land on the painted ring line,
	// so their hit points belong to a circle of known radius. Fitting that circle
	// tells where the ring centre is relative to the robot.
	static localize(player, p) {
		const s = p.self;
		const layer = player.visionLayer[VISION_LAYER.DOJO] || [];
		const ringLine = game.dojo.radius - game.dojo.border;
		const pts = [];
		for (let ray of layer) {
			if (ray.point == null || ray.distance === Infinity) continue;
			pts.push(ray.point.x - player.pos.x, ray.point.y - player.pos.y);
		}

		// Odometry: predict the pose with last tick's command (pushes are not seen).
		// The ring fit corrects it whenever enough of the line is in view; outside
		// the painted line facing out there is no fit and the prediction carries on.
		const prevDist = s.distCenter;
		if (s.localized && player.lastDrive && player.energy > 0) {
			const d = player.lastDrive, h = player.heading;
			const fwd = (d.speed || 0) * deltaTime, side = (d.sideSpeed || 0) * deltaTime;
			s.pos.x += Math.cos(h) * fwd - Math.sin(h) * side;
			s.pos.y += Math.sin(h) * fwd + Math.cos(h) * side;
		}

		let centre = null;
		if (pts.length >= 6) {
			const guess = s.localized ? { x: -s.pos.x, y: -s.pos.y } : Perception.fitCircleKasa(pts);
			if (guess) centre = Perception.refineCircleCentre(pts, guess, ringLine);
		}

		if (centre) {
			s.pos.x = -centre.x;
			s.pos.y = -centre.y;
			s.localized = true;
			s.fitAge = 0;
		} else if (!s.localized) {
			return;
		} else {
			s.fitAge++;
		}

		const outRadius = game.dojo.radius + player.radius;
		s.distCenter = Math.hypot(s.pos.x, s.pos.y);
		s.edgeMargin = outRadius - s.distCenter;
		s.radialSpeed = s.distCenter - prevDist;
		s.centerBearing = Perception.normalizeAngle(Math.atan2(-s.pos.y, -s.pos.x) - player.heading);
		s.edgeAhead = Perception.distanceToCircle(s.pos.x, s.pos.y, player.heading, outRadius);
		s.edgeBehind = Perception.distanceToCircle(s.pos.x, s.pos.y, player.heading + Math.PI, outRadius);
		s.edgeLeft = Perception.distanceToCircle(s.pos.x, s.pos.y, player.heading - Math.PI / 2, outRadius);
		s.edgeRight = Perception.distanceToCircle(s.pos.x, s.pos.y, player.heading + Math.PI / 2, outRadius);
	}

	// Algebraic circle fit x²+y²+Dx+Ey+F=0 (least squares). Used only to get a
	// first guess; it degrades on short, almost straight arcs.
	static fitCircleKasa(pts) {
		let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, sz = 0, sxz = 0, syz = 0;
		const n = pts.length / 2;
		for (let i = 0; i < pts.length; i += 2) {
			const x = pts[i], y = pts[i + 1], z = x * x + y * y;
			sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y;
			sz += z; sxz += x * z; syz += y * z;
		}
		const det3 = (a, b, c, d, e, f, g, h, k) => a * (e * k - f * h) - b * (d * k - f * g) + c * (d * h - e * g);
		const det = det3(sxx, sxy, sx, sxy, syy, sy, sx, sy, n);
		if (Math.abs(det) < 1e-6) return null;
		const D = det3(-sxz, sxy, sx, -syz, syy, sy, -sz, sy, n) / det;
		const E = det3(sxx, -sxz, sx, sxy, -syz, sy, sx, -sz, n) / det;
		return { x: -D / 2, y: -E / 2 };
	}

	// Damped Gauss-Newton on the centre with the known radius. The damping keeps
	// the direction a nearly straight arc cannot observe close to the previous estimate.
	static refineCircleCentre(pts, guess, radius) {
		let cx = guess.x, cy = guess.y, sq = 0;
		const n = pts.length / 2;
		const lambda = 0.02 * n;
		for (let iter = 0; iter < PERCEPTION.FIT_ITERATIONS; iter++) {
			let a11 = lambda, a12 = 0, a22 = lambda, b1 = 0, b2 = 0;
			sq = 0;
			for (let i = 0; i < pts.length; i += 2) {
				const dx = cx - pts[i], dy = cy - pts[i + 1];
				const d = Math.hypot(dx, dy);
				if (d < 1e-6) continue;
				const jx = dx / d, jy = dy / d, r = d - radius;
				a11 += jx * jx; a12 += jx * jy; a22 += jy * jy;
				b1 += jx * r; b2 += jy * r;
				sq += r * r;
			}
			const det = a11 * a22 - a12 * a12;
			if (Math.abs(det) < 1e-9) break;
			cx -= (a22 * b1 - a12 * b2) / det;
			cy -= (a11 * b2 - a12 * b1) / det;
		}
		return Math.sqrt(sq / n) <= PERCEPTION.FIT_MAX_RMS ? { x: cx, y: cy } : null;
	}

	static senseContact(player, p, prevPos) {
		const c = p.contact;
		const s = p.self;
		c.active = player.inContact && player.contactPoint != null;
		if (!c.active) {
			c.ticks = 0;
			c.stalledTicks = 0;
			c.front = c.side = c.back = false;
			return;
		}
		c.ticks++;
		c.bearing = Perception.normalizeAngle(Math.atan2(player.contactPoint.y - player.pos.y, player.contactPoint.x - player.pos.x) - player.heading);
		const a = Math.abs(c.bearing);
		c.front = a < PERCEPTION.FRONT_CONTACT;
		c.back = a > PERCEPTION.BACK_CONTACT;
		c.side = !c.front && !c.back;

		// Who is winning the shove: our displacement along the heading while we
		// were driving forward into a frontal contact.
		const lastSpeed = player.lastDrive ? player.lastDrive.speed : 0;
		if (c.front && prevPos && s.localized && lastSpeed > 0) {
			const advance = (s.pos.x - prevPos.x) * Math.cos(player.heading) + (s.pos.y - prevPos.y) * Math.sin(player.heading);
			c.advance = advance;
			const k = PERCEPTION.MODEL_SMOOTHING * 2;
			p.model.pushBalance += k * (Math.max(-1, Math.min(1, advance / 5)) - p.model.pushBalance);
		}
		c.stalledTicks = c.front && Math.abs(c.advance) < 1.5 ? c.stalledTicks + 1 : 0;
	}

	static trackEnemy(player, p) {
		const e = p.enemy;
		const s = p.self;
		const layer = player.visionLayer[VISION_LAYER.PLAYER] || [];

		let minA = Infinity, maxA = -Infinity, hits = 0;
		e.clipped = false;
		for (let i = 0; i < layer.length; i++) {
			const ray = layer[i];
			if (ray.point == null || ray.distance === Infinity) continue;
			const a = player.rayBaseAngles[i];
			hits++;
			if (a < minA) minA = a;
			if (a > maxA) maxA = a;
			if (i == 0 || i == layer.length - 1) e.clipped = true;
		}

		const energyPerPx = deltaTime * 0.1; // same rule as Player.move()
		const seenBefore = e.ticksUnseen === 0;
		e.visible = hits > 0;

		if (e.visible) {
			e.bearing = (minA + maxA) / 2;
			// The opponent's visible body is a cross centred on it: the ray closest to
			// the bearing passes next to that centre, so its range is the best estimate.
			let bestGap = Infinity;
			for (let i = 0; i < layer.length; i++) {
				const ray = layer[i];
				if (ray.point == null || ray.distance === Infinity) continue;
				const gap = Math.abs(player.rayBaseAngles[i] - e.bearing);
				if (gap < bestGap) {
					bestGap = gap;
					e.distance = ray.distance;
				}
			}
			const worldAngle = player.heading + e.bearing;
			e.lastSeenWorldBearing = worldAngle;
			e.predictedBearing = e.bearing;
			e.ticksUnseen = 0;

			if (s.localized) {
				const raw = { x: s.pos.x + Math.cos(worldAngle) * e.distance, y: s.pos.y + Math.sin(worldAngle) * e.distance };
				if (e.pos == null || !seenBefore) {
					e.pos = raw;
					e.vel.x = e.vel.y = 0;
				} else {
					// Alpha-beta tracker: predict with the velocity, correct with the residual.
					const prev = { x: e.pos.x, y: e.pos.y };
					const rx = raw.x - (e.pos.x + e.vel.x), ry = raw.y - (e.pos.y + e.vel.y);
					e.pos.x += e.vel.x + PERCEPTION.TRACK_ALPHA * rx;
					e.pos.y += e.vel.y + PERCEPTION.TRACK_ALPHA * ry;
					e.vel.x += PERCEPTION.TRACK_BETA * rx;
					e.vel.y += PERCEPTION.TRACK_BETA * ry;
					const moved = Math.hypot(e.pos.x - prev.x, e.pos.y - prev.y);

					if (p.contact.active) {
						// Shoving us: assume it spends at least what we spend, more if it is winning.
						const ratio = p.contact.advance > 0 ? 0.5 : 1;
						e.energyEst -= Math.max(e.spendRate, s.energySpent * ratio);
						e.idleTicks = 0;
					} else if (moved > PERCEPTION.IDLE_SPEED) {
						const spent = moved * energyPerPx;
						e.energyEst -= spent;
						e.spendRate += 0.05 * (spent - e.spendRate);
						e.idleTicks = 0;
					} else {
						e.spendRate += 0.05 * (0 - e.spendRate);
						e.idleTicks++;
					}
				}

				const toUsX = s.pos.x - e.pos.x, toUsY = s.pos.y - e.pos.y;
				const toUsLen = Math.hypot(toUsX, toUsY) || 1;
				e.towardUs = (e.vel.x * toUsX + e.vel.y * toUsY) / toUsLen;
				if (!p.contact.active) {
					const m = p.model;
					m.aggression += PERCEPTION.MODEL_SMOOTHING * (Math.max(0, Math.min(1, e.towardUs / 8)) - m.aggression);
					if (e.towardUs > PERCEPTION.CHARGE_SPEED && e.distance < 250) m.charges++;
				}
			}
		} else {
			e.ticksUnseen = e.ticksUnseen === Infinity ? Infinity : e.ticksUnseen + 1;
			e.energyEst -= e.spendRate;
			if (e.refuted) {
				// The guess was looked at and nothing was there: no prediction until seen again.
				e.predictedBearing = null;
			} else if (e.pos && s.localized) {
				// Dead reckoning for a short while, then just the last known spot.
				const t = Math.min(e.ticksUnseen, 20);
				const px = e.pos.x + e.vel.x * t, py = e.pos.y + e.vel.y * t;
				e.predictedBearing = Perception.normalizeAngle(Math.atan2(py - s.pos.y, px - s.pos.x) - player.heading);
				e.distance = Math.hypot(px - s.pos.x, py - s.pos.y);
			} else if (e.lastSeenWorldBearing != null) {
				e.predictedBearing = Perception.normalizeAngle(e.lastSeenWorldBearing - player.heading);
			}
			// A predicted bearing well inside the field of view that shows nothing is wrong.
			const halfFov = Math.PI / 180 * player.halfFieldOfView;
			if (e.predictedBearing != null && Math.abs(e.predictedBearing) < halfFov * 0.8)
				e.refuted = true;
		}
		if (e.visible) e.refuted = false;
		e.energyEst = Math.max(0, Math.min(100, e.energyEst));

		if (e.pos) {
			// While the round runs the opponent is still inside the ring-out distance.
			const outRadius = game.dojo.radius + player.radius; // regulation size, same robot radius
			const r = Math.hypot(e.pos.x, e.pos.y);
			if (r > outRadius) {
				e.pos.x *= outRadius / r;
				e.pos.y *= outRadius / r;
			}
			e.edgeMargin = outRadius - Math.min(r, outRadius);
		}
	}
}

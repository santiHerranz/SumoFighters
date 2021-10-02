// Daniel Shiffman
// https://thecodingtrain.com/CodingChallenges/146-rendering-ray-casting.html
// https://youtu.be/vYgIKn7iDH8

// Rendering Ray Casting

class Boundary {
    constructor(x1, y1, x2, y2, type = 1) {
      this.a = createVector(x1, y1);
      this.b = createVector(x2, y2);
      this.type = 1;
    }
  
    show() {

      if (showBoundaries) {
        ctx.strokeStyle  = "#fff";

        ctx.beginPath();
        ctx.moveTo(this.a.x, this.a.y);
        ctx.lineTo(this.b.x, this.b.y);
        ctx.stroke();
      }

    }
  }
  
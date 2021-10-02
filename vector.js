
class Vector {

    constructor(x, y, z){
      this.x = x, this.y = y, this.z = z;
  
    }

    set(x,y,z) {
      this.x = x, this.y = y, this.z = z;
    }
  
    static fromAngle = function(angle, length) {
      if (typeof length === 'undefined') {
        length = 1;
      }
      return new Vector(length * Math.cos(angle), length * Math.sin(angle), 0);
    };
  
  
    static dist = function dist(v1, v2) {
      return v1.dist(v2);
    };
  
    dist = function dist(v) {
        var dx = v.x - this.x,
        dy = v.y - this.y;

        return Math.sqrt(dx * dx + dy * dy);

    //   return v
    //     .copy()
    //     .sub(this)
    //     .mag();
    };
  
    copy = function copy() {
      return new Vector(this.x, this.y, this.z);
    };
  
    sub = function sub(x, y, z) {
      if (x instanceof Vector) {
        this.x -= x.x || 0;
        this.y -= x.y || 0;
        this.z -= x.z || 0;
        return this;
      }
      if (x instanceof Array) {
        this.x -= x[0] || 0;
        this.y -= x[1] || 0;
        this.z -= x[2] || 0;
        return this;
      }
      this.x -= x || 0;
      this.y -= y || 0;
      this.z -= z || 0;
      return this;
    };
  
    mag = function mag() {
      return Math.sqrt(this.magSq());
    };
  
    magSq = function magSq() {
      const x = this.x;
      const y = this.y;
      const z = this.z;
      return x * x + y * y + z * z;
    };
  
    heading = function heading() {
      const h = Math.atan2(this.y, this.x);
      return h;
    };


    normalize = function normalize() {
      const len = this.mag();
      // here we multiply by the reciprocal instead of calling 'div()'
      // since div duplicates this zero check.
      if (len !== 0) this.mult(1 / len);
      return this;
    };

    mult = function mult(x, y, z) {
      if (x instanceof Vector) {
        // new p5.Vector will check that values are valid upon construction but it's possible
        // that someone could change the value of a component after creation, which is why we still
        // perform this check
        if (
          Number.isFinite(x.x) &&
          Number.isFinite(x.y) &&
          Number.isFinite(x.z) &&
          typeof x.x === 'number' &&
          typeof x.y === 'number' &&
          typeof x.z === 'number'
        ) {
          this.x *= x.x;
          this.y *= x.y;
          this.z *= x.z;
        } else {
          console.warn(
            'p5.Vector.prototype.mult:',
            'x contains components that are either undefined or not finite numbers'
          );
        }
        return this;
      }
    }

    setMag = function setMag(n) {
      return this.normalize().mult(n);
    };

    add = function add(x, y, z) {
      if (x instanceof Vector) {
        this.x += x.x || 0;
        this.y += x.y || 0;
        this.z += x.z || 0;
        return this;
      }
      if (x instanceof Array) {
        this.x += x[0] || 0;
        this.y += x[1] || 0;
        this.z += x[2] || 0;
        return this;
      }
      this.x += x || 0;
      this.y += y || 0;
      this.z += z || 0;
      return this;
    };
    
  
  }  
  
  function createVector (x, y, z) {
    return new Vector(x, y, z);
  };
  
let { GWE } = require('gwe');

class Controller extends GWE.GfxJAM {
  constructor() {
    super();
    this.radius = 0;
    this.speed = 7;
  }

  getRadius() {
    return this.radius;
  }

  setRadius(radius) {
    this.radius = radius;
  }

  getSpeed() {
    return this.speed;
  }

  setSpeed(speed) {
    this.speed = speed;
  }

  getHandPosition() {
    let direction = GWE.Utils.VEC3_CREATE(Math.cos(this.rotation[1]), 0, Math.sin(this.rotation[1]));
    return GWE.Utils.VEC3_ADD(this.position, GWE.Utils.VEC3_SCALE(direction, this.radius + 0.5));
  }
}

module.exports.Controller = Controller;
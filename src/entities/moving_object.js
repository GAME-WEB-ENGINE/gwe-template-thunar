let { GWE } = require('gwe');

class MovingObject extends GWE.GfxJAM {
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
}

module.exports.MovingObject = MovingObject;
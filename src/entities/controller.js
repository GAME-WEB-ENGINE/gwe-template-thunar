let { GWE } = require('gwe');
let { MovingObject } = require('./moving_object');

class Controller extends MovingObject {
  constructor() {
    super();
  }

  getHandPosition() {
    let direction = GWE.Utils.VEC3_CREATE(Math.cos(this.rotation[1]), 0, Math.sin(this.rotation[1]));
    return GWE.Utils.VEC3_ADD(this.position, GWE.Utils.VEC3_SCALE(direction, this.radius + 0.5));
  }
}

module.exports.Controller = Controller;
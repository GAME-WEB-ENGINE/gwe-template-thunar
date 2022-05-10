let { GWE } = require('gwe');
let { MovingObject } = require('./moving_object');

class Controller extends MovingObject {
  constructor() {
    super();
  }

  getHandPosition() {
    return GWE.Utils.VEC3_ADD(this.position, GWE.Utils.VEC3_SCALE(this.getDirection(), this.radius + 0.5));
  }
}

module.exports.Controller = Controller;

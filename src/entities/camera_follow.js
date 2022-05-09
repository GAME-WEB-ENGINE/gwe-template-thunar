let { GWE } = require('gwe');

class CameraFollow {
  constructor() {
    this.targetDrawable = null;
    this.minClipOffset = [-1, -1];
    this.maxClipOffset = [1, 1];
    this.view = GWE.gfxManager.getView(0);

    this.view.setProjectionMode(GWE.ProjectionModeEnum.PERSPECTIVE);
    GWE.gfxManager.setShowDebug(true);
  }

  getTargetDrawable() {
    return this.targetDrawable;
  }

  setTargetDrawable(targetDrawable) {
    this.targetDrawable = targetDrawable;
  }

  setMinClipOffset(minClipOffsetX, minClipOffsetY) {
    this.minClipOffset[0] = minClipOffsetX;
    this.minClipOffset[1] = minClipOffsetY;
  }

  setMaxClipOffset(maxClipOffsetX, maxClipOffsetY) {
    this.maxClipOffset[0] = maxClipOffsetX;
    this.maxClipOffset[1] = maxClipOffsetY;
  }
  
  setMatrix(matrix) {
    this.view.setCameraMatrix(matrix);
  }

  setFovy(fovy) {
    this.view.setPerspectiveFovy(fovy);
  }

  update(ts) {
    let clipOffset = this.view.getClipOffset();
    let worldPosition = this.targetDrawable.getPosition();
    let screenPosition = GWE.gfxManager.getScreenPosition(0, worldPosition[0], worldPosition[1], worldPosition[2]);

    this.view.setClipOffset([
      GWE.Utils.CLAMP(screenPosition[0] + clipOffset[0], this.minClipOffset[0], this.maxClipOffset[0]),
      GWE.Utils.CLAMP(screenPosition[1] + clipOffset[1], this.minClipOffset[1], this.maxClipOffset[1])
    ]);
  }
}

module.exports.CameraFollow = CameraFollow;
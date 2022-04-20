let { GWE } = require('gwe');
let { Room } = require('./room');

class GameScreen extends GWE.Screen {
  constructor(app) {
    super(app);
    this.room = null;
  }

  handleEvent(event) {
    if (this.room) {
      this.room.handleEvent(event);
    }
  }

  update(ts) {
    if (this.room) {
      this.room.update(ts);
    }
  }

  draw(viewIndex) {
    if (this.room) {
      this.room.draw(viewIndex);
    }
  }

  onEnter() {
    GWE.gfxManager.setShowDebug(true);
    this.loadRoom('./assets/rooms/sample00/data.room', 'Spawn0000');
  }

  async loadRoom(path, spawnName) {
    this.room = new Room();
    await this.room.loadFromFile(path, spawnName);
  }
}

module.exports.GameScreen = GameScreen;
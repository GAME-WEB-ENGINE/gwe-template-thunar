let fs = require('fs');
let { GWE } = require('gwe');
let { Spawn } = require('./spawn');
let { Model } = require('./model');
let { Trigger } = require('./trigger');

let PLAYER_SPEED = 7;
let WORLD_DIRECTION_NULL = [0, 0];
let WORLD_DIRECTION_LEFT = [-1, 0];
let WORLD_DIRECTION_RIGHT = [1, 0];
let WORLD_DIRECTION_FORWARD = [0, -1];
let WORLD_DIRECTION_BACKWARD = [0, 1];

class Room extends GWE.GfxDrawable {
  constructor() {
    super();
    this.name = '';
    this.description = '';
    this.musicFile = '';
    this.width = 0; // largeur scene / (largeur vue * 0.5)
    this.height = 0; // hauteur scene / (hauteur vue * 0.5)
    this.scriptMachine = new GWE.ScriptMachine();
    this.map = null;
    this.walkmesh = null;
    this.spawns = [];
    this.models = [];
    this.movers = [];
    this.triggers = [];
    this.playerModel = null;
    this.activeDrawable = null;
    this.loaded = false;
    this.running = true;
    this.view = GWE.gfxManager.getView(0);

    this.scriptMachine.registerCommand('UI_CREATE_DIALOG', GWE.Utils.BIND(this.$uiCreateDialog, this));
    this.scriptMachine.registerCommand('UI_CREATE_CHOICES', GWE.Utils.BIND(this.$uiCreateChoices, this));
    this.scriptMachine.registerCommand('MODEL_PLAY_MOVER', GWE.Utils.BIND(this.$modelPlayMover, this));
    this.scriptMachine.registerCommand('MODEL_PLAY_ANIMATION', GWE.Utils.BIND(this.$modelPlayAnimation, this));
    this.scriptMachine.registerCommand('RUN', GWE.Utils.BIND(this.$run, this));
    this.scriptMachine.registerCommand('STOP', GWE.Utils.BIND(this.$stop, this));
  }

  handleEvent(event) {
    if (!this.running) {
      return;
    }

    if (event instanceof GWE.KeydownOnceEvent && event.key == GWE.InputKeyEnum.ENTER) {
      if (this.activeDrawable) {
        let onActionBlockId = this.activeDrawable.getOnActionBlockId();
        if (onActionBlockId) {
          this.scriptMachine.jump(onActionBlockId);
        }
      }
    }
  }

  update(ts) {
    if (!this.loaded) {
      return;
    }

    this.updateMap(ts);
    this.updateWalkmesh(ts);
    this.updateSpawns(ts);
    this.updateModels(ts);
    this.updateMovers(ts);
    this.updateTriggers(ts);
    this.updateActive(ts);
    this.updatePlayer(ts);
    this.updateCamera(ts);
    this.updateScriptMachine(ts);
  }

  updateMap(ts) {
    this.map.update(ts);
  }

  updateWalkmesh(ts) {
    this.walkmesh.update(ts);
  }

  updateSpawns(ts) {
    for (let spawn of this.spawns) {
      spawn.update(ts);
    }
  }

  updateModels(ts) {
    for (let model of this.models) {
      model.update(ts);
    }
  }

  updateMovers(ts) {
    for (let mover of this.movers) {
      mover.update(ts);
    }
  }

  updateTriggers(ts) {
    for (let trigger of this.triggers) {
      trigger.update(ts);
    }
  }

  updateActive(ts) {
    let playerPosition = this.playerModel.getPosition();
    let playerRadius = this.playerModel.getRadius();
    let playerRotation = this.playerModel.getRotation();
    let playerDirection = [Math.cos(playerRotation[1]), 0, Math.sin(playerRotation[1])];
    let playerTargetPosition = GWE.Utils.VEC3_ADD(playerPosition, GWE.Utils.VEC3_SCALE(playerDirection, playerRadius + 0.5));
    let activeDrawable = null;

    for (let trigger of this.triggers) {
      if (GWE.Utils.VEC3_DISTANCE(trigger.getPosition(), playerPosition) <= playerRadius + trigger.getRadius()) {
        activeDrawable = trigger;
        break;
      }
    }

    for (let model of this.models) {
      if (GWE.Utils.VEC3_DISTANCE(model.getPosition(), playerTargetPosition) <= model.getRadius()) {
        activeDrawable = model;
        break;
      }
    }

    if (activeDrawable instanceof Trigger && activeDrawable != null && activeDrawable != this.activeDrawable) {
      let onEnterBlockId = activeDrawable.getOnEnterBlockId();
      if (onEnterBlockId) {
        this.scriptMachine.jump(onEnterBlockId);
      }
    }

    if (activeDrawable instanceof Trigger && activeDrawable == null && activeDrawable != this.activeDrawable) {
      let onLeaveBlockId = this.activeDrawable.getOnLeaveBlockId();
      if (onLeaveBlockId) {
        this.scriptMachine.jump(onLeaveBlockId);
      }
    }

    this.activeDrawable = activeDrawable;
  }

  updatePlayer(ts) {
    if (!this.running) {
      return;
    }

    let playerDirection = WORLD_DIRECTION_NULL;

    if (GWE.inputManager.isKeyDown(GWE.InputKeyEnum.LEFT)) {
      playerDirection = WORLD_DIRECTION_LEFT;
    }
    else if (GWE.inputManager.isKeyDown(GWE.InputKeyEnum.RIGHT)) {
      playerDirection = WORLD_DIRECTION_RIGHT;
    }
    else if (GWE.inputManager.isKeyDown(GWE.InputKeyEnum.UP)) {
      playerDirection = WORLD_DIRECTION_FORWARD;
    }
    else if (GWE.inputManager.isKeyDown(GWE.InputKeyEnum.DOWN)) {
      playerDirection = WORLD_DIRECTION_BACKWARD;
    }

    if (playerDirection != WORLD_DIRECTION_NULL) {
      this.moveModel(this.playerModel, GWE.Utils.VEC2_SCALE(playerDirection, PLAYER_SPEED * (ts / 1000)));
      this.playerModel.play('RUN', true);
    }
    else {
      this.playerModel.play('IDLE', true);
    }
  }

  updateCamera(ts) {
    let clipOffset = this.view.getClipOffset();
    let playerPosition = this.playerModel.getPosition();
    let playerScreenPosition = GWE.gfxManager.getScreenPosition(0, playerPosition[0], playerPosition[1], playerPosition[2]);

    let playerScreenGlobalPositionX = playerScreenPosition[0] + clipOffset[0];
    let playerScreenGlobalPositionY = playerScreenPosition[1] + clipOffset[1];

    let borderX = (this.width - 2) * 0.5;
    let borderY = (this.height - 2) * 0.5;

    let nextClipOffsetX = GWE.Utils.CLAMP(playerScreenGlobalPositionX, -borderX, +borderX);
    let nextClipOffsetY = GWE.Utils.CLAMP(playerScreenGlobalPositionY, -borderY, +borderY);
    this.view.setClipOffset([nextClipOffsetX, nextClipOffsetY]);
  }

  updateScriptMachine(ts) {
    this.scriptMachine.update(ts);
  }

  draw(viewIndex) {
    if (!this.loaded) {
      return;
    }

    this.drawMap(viewIndex);
    this.drawWalkmesh(viewIndex);
    this.drawSpawns(viewIndex);
    this.drawModels(viewIndex);
    this.drawMovers(viewIndex);
    this.drawTriggers(viewIndex);
  }

  drawMap(viewIndex) {
    this.map.draw(viewIndex);
  }

  drawWalkmesh(viewIndex) {
    this.walkmesh.draw(viewIndex);
  }

  drawSpawns(viewIndex) {
    for (let spawn of this.spawns) {
      spawn.draw(viewIndex);
    }
  }

  drawModels(viewIndex) {
    for (let model of this.models) {
      model.draw(viewIndex);
    }
  }

  drawMovers(viewIndex) {
    for (let mover of this.movers) {
      mover.draw(viewIndex);
    }
  }

  drawTriggers(viewIndex) {
    for (let trigger of this.triggers) {
      trigger.draw(viewIndex);
    }
  }

  async loadFromFile(path, spawnName) {
    let json = JSON.parse(fs.readFileSync(path));
    if (!json.hasOwnProperty('Ident') || json['Ident'] != 'ROOM') {
      throw new Error('Room::loadFromFile(): File not valid !');
    }

    this.name = json['Name'];
    this.description = json['Description'];
    this.width = json['Width'];
    this.height = json['Height'];
    this.scriptMachine.loadFromFile(json['ScriptFile']);
    this.musicFile = json['MusicFile'];

    this.map = new GWE.GfxJSM();
    this.map.loadFromFile(json['MapFile']);
    this.map.setTexture(await GWE.textureManager.loadTexture(json['MapTextureFile']));

    this.walkmesh = new GWE.GfxJWM();
    this.walkmesh.loadFromFile(json['WalkmeshFile']);

    for (let obj of json['Spawns']) {
      let spawn = new Spawn();
      spawn.setName(obj['Name']);
      spawn.setPosition(obj['Position']);
      spawn.setRadius(0.2);
      spawn.setDirection(obj['Direction']);
      this.spawns.push(spawn);
    }

    for (let obj of json['Models']) {
      let model = new Model();
      model.loadFromFile(obj['JAMFile']);
      model.setTexture(await GWE.textureManager.loadTexture(obj['TextureFile']));
      model.setPosition(obj['Position']);
      model.setRotation(obj['Rotation']);
      model.setRadius(obj['Radius']);
      model.setOnActionBlockId(obj['OnActionBlockId']);
      model.play('IDLE', true);
      this.models.push(model);
    }

    for (let obj of json['Movers']) {
      let mover = new GWE.GfxMover();
      mover.setSpeed(obj['Speed']);
      mover.setPoints(obj['Points']);
      this.movers.push(mover);
    }

    for (let obj of json['Triggers']) {
      let trigger = new Trigger();
      trigger.setPosition(obj['Position']);
      trigger.setRadius(obj['Radius']);
      trigger.setOnEnterBlockId(obj['OnEnterBlockId']);
      trigger.setOnLeaveBlockId(obj['OnLeaveBlockId']);
      trigger.setOnActionBlockId(obj['OnActionBlockId']);
      this.triggers.push(trigger);
    }

    let spawn = this.spawns.find(spawn => spawn.getName() == spawnName);
    let spawnDirectionAngle = GWE.Utils.VEC2_ANGLE(spawn.direction);

    this.playerModel = this.models[json['PlayerModelIndex']];
    this.playerModel.setPosition(spawn.position);
    this.playerModel.setRotation([0, spawnDirectionAngle, 0]);

    this.view.setProjectionMode(json['CameraProjectionMode']);
    this.view.setCameraMatrix(json['CameraMatrix']);
    this.view.setPerspectiveFovy(GWE.Utils.DEG_TO_RAD(parseInt(json['CameraFovy'])));

    this.scriptMachine.jump('ON_INIT');
    this.scriptMachine.setEnabled(true);

    this.loaded = true;
  }

  moveModel(model, velocity = [0, 0]) {
    let nextPosition = GWE.Utils.VEC3_ADD(model.getPosition(), [velocity[0], 0, velocity[1]]);
    let radius = model.getRadius();

    for (let other of this.models) {
      if (other == model) {
        continue;
      }

      if (GWE.Utils.VEC3_DISTANCE(other.getPosition(), nextPosition) <= radius + other.getRadius()) {
        return;
      }
    }

    let p0Elevation = this.walkmesh.getElevationAt(nextPosition[0], nextPosition[2]);
    let p1Elevation = this.walkmesh.getElevationAt(nextPosition[0] - radius, nextPosition[2] - radius);
    let p2Elevation = this.walkmesh.getElevationAt(nextPosition[0] - radius, nextPosition[2] + radius);
    let p3Elevation = this.walkmesh.getElevationAt(nextPosition[0] + radius, nextPosition[2] - radius);
    let p4Elevation = this.walkmesh.getElevationAt(nextPosition[0] + radius, nextPosition[2] + radius);
    if (p0Elevation == Infinity || p1Elevation == Infinity || p2Elevation == Infinity || p3Elevation == Infinity || p4Elevation == Infinity) {
      return;
    }

    model.setRotation([0, GWE.Utils.VEC2_ANGLE(velocity), 0]);
    model.setPosition([nextPosition[0], p0Elevation, nextPosition[2]]);
  }

  async $uiCreateDialog(author, text) {
    this.scriptMachine.setEnabled(false);
    let uiDialog = new GWE.UIDialog();
    uiDialog.setAuthor(author);
    uiDialog.setText(text);
    GWE.uiManager.addWidget(uiDialog);
    GWE.uiManager.focus(uiDialog);
    await GWE.eventManager.wait(uiDialog, 'E_CLOSE');
    GWE.uiManager.removeWidget(uiDialog);
    this.scriptMachine.setEnabled(true);
  }

  async $uiCreateChoices(author, text, choices = []) {
    this.scriptMachine.setEnabled(false);
    let uiDialog = new GWE.UIDialog();
    uiDialog.setAuthor(author);
    uiDialog.setText(text);
    GWE.uiManager.addWidget(uiDialog);
    await GWE.eventManager.wait(uiDialog, 'E_PRINT_FINISHED');

    let uiMenu = new GWE.UIMenu();
    GWE.uiManager.addWidget(uiMenu, 'position:absolute; top:50%; left:50%; transform:translate(-50%,-50%)');
    for (let choice of choices) {
      uiMenu.addWidget(new GWE.UIMenuText({ text: choice['Text'] }));
    }

    GWE.uiManager.focus(uiMenu);
    let data = await GWE.eventManager.wait(uiMenu, 'E_MENU_ITEM_SELECTED');
    GWE.uiManager.removeWidget(uiDialog);
    GWE.uiManager.removeWidget(uiMenu);
    this.scriptMachine.jump(choices[data.index]['Jumpto']);
    this.scriptMachine.setEnabled(true);
  }

  $modelPlayMover(modelIndex, moverIndex) {
    let model = this.models[modelIndex];
    let mover = this.movers[moverIndex];
    mover.setDrawable(model);
    mover.play();
  }

  $modelPlayAnimation(modelIndex, animationName, isLooped) {
    let model = this.models[modelIndex];
    model.play(animationName, isLooped);
  }

  $run() {
    this.running = true;
  }

  $stop() {
    this.running = false;
  }
}

module.exports.Room = Room;
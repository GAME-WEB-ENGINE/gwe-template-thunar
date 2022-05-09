let fs = require('fs');
let { GWE } = require('gwe');
let { Spawn } = require('../entities/spawn');
let { Model } = require('../entities/model');
let { Trigger } = require('../entities/trigger');
let { Controller } = require('../entities/controller');
let { CameraFollow } = require('../entities/camera_follow');

class GameScreen extends GWE.Screen {
  constructor(app) {
    super(app);
    this.player = null;
    this.scriptMachine = null;
    this.running = true;
    this.room = {};
    this.room.name = '';
    this.room.description = '';
    this.room.musicFile = '';
    this.room.map = null;
    this.room.walkmesh = null;
    this.room.controller = null;
    this.room.camera = null;
    this.room.spawns = [];
    this.room.models = [];
    this.room.movers = [];
    this.room.triggers = [];
    this.room.loaded = false;
  }

  onEnter() {
    this.player = this.app.getPlayer();

    this.scriptMachine = new GWE.ScriptMachine();
    this.scriptMachine.registerCommand('RUN', GWE.Utils.BIND(this.$run, this));
    this.scriptMachine.registerCommand('STOP', GWE.Utils.BIND(this.$stop, this));
    this.scriptMachine.registerCommand('WAITPAD', GWE.Utils.BIND(this.$waitPad, this));
    this.scriptMachine.registerCommand('GOTO', GWE.Utils.BIND(this.$goto, this));
    this.scriptMachine.registerCommand('GOTO_IF', GWE.Utils.BIND(this.$gotoIf, this));
    this.scriptMachine.registerCommand('EXEC_IF', GWE.Utils.BIND(this.$execIf, this));
    this.scriptMachine.registerCommand('VAR_SET', GWE.Utils.BIND(this.$varSet, this));
    this.scriptMachine.registerCommand('VAR_ADD', GWE.Utils.BIND(this.$varAdd, this));
    this.scriptMachine.registerCommand('VAR_SUB', GWE.Utils.BIND(this.$varSub, this));
    this.scriptMachine.registerCommand('DELAY', GWE.Utils.BIND(this.$delay, this));
    this.scriptMachine.registerCommand('UI_CREATE_DIALOG', GWE.Utils.BIND(this.$uiCreateDialog, this));
    this.scriptMachine.registerCommand('UI_CREATE_CHOICES', GWE.Utils.BIND(this.$uiCreateChoices, this));
    this.scriptMachine.registerCommand('UI_FADE_IN', GWE.Utils.BIND(this.$uiFadeIn, this));
    this.scriptMachine.registerCommand('UI_FADE_OUT', GWE.Utils.BIND(this.$uiFadeOut, this));
    this.scriptMachine.registerCommand('MODEL_PLAY_MOVER', GWE.Utils.BIND(this.$modelPlayMover, this));
    this.scriptMachine.registerCommand('MODEL_PLAY_ANIMATION', GWE.Utils.BIND(this.$modelPlayAnimation, this));

    this.loadRoom('./assets/rooms/sample00/data.room', 'Spawn0000');
  }

  handleEvent(event) {
    if (!this.room.loaded) {
      return;
    }
    if (!this.running) {
      return;
    }

    if (event instanceof GWE.KeydownOnceEvent && event.key == GWE.InputKeyEnum.ENTER) {
      this.utilsControllerAction();
    }
  }

  update(ts) {
    this.updateControllerInput(ts);
    this.updateRoom(ts);
    this.updateScriptMachine(ts);
  }

  updateControllerInput(ts) {
    if (!this.room.loaded) {
      return;
    }
    if (!this.running) {
      return;
    }

    let direction = GWE.Utils.VEC3_ZERO;
    if (GWE.inputManager.isKeyDown(GWE.InputKeyEnum.LEFT)) {
      direction = GWE.Utils.VEC3_LEFT;
    }
    else if (GWE.inputManager.isKeyDown(GWE.InputKeyEnum.RIGHT)) {
      direction = GWE.Utils.VEC3_RIGHT;
    }
    else if (GWE.inputManager.isKeyDown(GWE.InputKeyEnum.UP)) {
      direction = GWE.Utils.VEC3_FORWARD;
    }
    else if (GWE.inputManager.isKeyDown(GWE.InputKeyEnum.DOWN)) {
      direction = GWE.Utils.VEC3_BACKWARD;
    }

    if (direction != GWE.Utils.VEC3_ZERO) {
      this.utilsControllerMove(GWE.Utils.VEC3_SCALE(direction, this.room.controller.getSpeed() * (ts / 1000)));
      this.room.controller.setRotation([0, GWE.Utils.VEC2_ANGLE([direction[0], direction[2]]), 0]);
      this.room.controller.play('RUN', true);
    }
    else {
      this.room.controller.play('IDLE', true);
    }
  }

  updateRoom(ts) {
    if (!this.room.loaded) {
      return;
    }

    this.room.map.update(ts);
    this.room.walkmesh.update(ts);
    this.room.controller.update(ts);
    this.room.camera.update(ts);

    for (let spawn of this.room.spawns) {
      spawn.update(ts);
    }

    for (let model of this.room.models) {
      model.update(ts);
    }

    for (let mover of this.room.movers) {
      mover.update(ts);
    }

    for (let trigger of this.room.triggers) {
      trigger.update(ts);
    }
  }

  updateScriptMachine(ts) {
    if (!this.room.loaded) {
      return;
    }

    this.scriptMachine.update(ts);
  }

  draw(viewIndex) {
    if (!this.room.loaded) {
      return;
    }

    this.room.map.draw(viewIndex);
    this.room.walkmesh.draw(viewIndex);
    this.room.controller.draw(viewIndex);

    for (let spawn of this.room.spawns) {
      spawn.draw(viewIndex);
    }

    for (let model of this.room.models) {
      model.draw(viewIndex);
    }

    for (let mover of this.room.movers) {
      mover.draw(viewIndex);
    }

    for (let trigger of this.room.triggers) {
      trigger.draw(viewIndex);
    }
  }

  async loadRoom(path, spawnName) {
    let json = JSON.parse(fs.readFileSync(path));
    if (!json.hasOwnProperty('Ident') || json['Ident'] != 'ROOM') {
      throw new Error('Room::loadFromFile(): File not valid !');
    }

    this.room.name = json['Name'];
    this.room.description = json['Description'];
    this.room.musicFile = json['MusicFile'];

    this.room.map = new GWE.GfxJSM();
    this.room.map.loadFromFile(json['MapFile']);
    this.room.map.setTexture(await GWE.textureManager.loadTexture(json['MapTextureFile']));

    this.room.walkmesh = new GWE.GfxJWM();
    this.room.walkmesh.loadFromFile(json['WalkmeshFile']);

    this.room.controller = new Controller();
    this.room.controller.loadFromFile(json['Controller']['JAMFile']);
    this.room.controller.setTexture(await GWE.textureManager.loadTexture(json['Controller']['TextureFile']));
    this.room.controller.setRadius(json['Controller']['Radius']);
    this.room.controller.play('IDLE', true);

    this.room.camera = new CameraFollow();
    this.room.camera.setTargetDrawable(this.room.controller);
    this.room.camera.setMatrix(json['CameraMatrix']);
    this.room.camera.setFovy(GWE.Utils.DEG_TO_RAD(parseInt(json['CameraFovy'])));
    this.room.camera.setMinClipOffset(json['CameraMinClipOffsetX'], json['CameraMinClipOffsetY']);
    this.room.camera.setMaxClipOffset(json['CameraMaxClipOffsetX'], json['CameraMaxClipOffsetY']);

    for (let obj of json['Spawns']) {
      let spawn = new Spawn();
      spawn.setName(obj['Name']);
      spawn.setPosition(obj['Position']);
      spawn.setRadius(0.2);
      spawn.setDirection(obj['Direction']);
      this.room.spawns.push(spawn);
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
      this.room.models.push(model);
    }

    for (let obj of json['Movers']) {
      let mover = new GWE.GfxMover();
      mover.setSpeed(obj['Speed']);
      mover.setPoints(obj['Points']);
      this.room.movers.push(mover);
    }

    for (let obj of json['Triggers']) {
      let trigger = new Trigger();
      trigger.setPosition(obj['Position']);
      trigger.setRadius(obj['Radius']);
      trigger.setOnEnterBlockId(obj['OnEnterBlockId']);
      trigger.setOnLeaveBlockId(obj['OnLeaveBlockId']);
      trigger.setOnActionBlockId(obj['OnActionBlockId']);
      this.room.triggers.push(trigger);
    }

    let spawn = this.room.spawns.find(spawn => spawn.getName() == spawnName);
    let spawnDirectionAngle = GWE.Utils.VEC2_ANGLE(spawn.direction);
    this.room.controller.setPosition(spawn.position);
    this.room.controller.setRotation([0, spawnDirectionAngle, 0]);

    this.scriptMachine.loadFromFile(json['ScriptFile']);
    this.scriptMachine.jump('ON_INIT');
    this.scriptMachine.setEnabled(true);

    this.room.loaded = true;
  }

  utilsControllerAction() {
    let position = this.room.controller.getPosition();
    let radius = this.room.controller.getRadius();
    let rotation = this.room.controller.getRotation();

    for (let trigger of this.room.triggers) {
      if (GWE.Utils.VEC3_DISTANCE(trigger.getPosition(), position) <= radius + trigger.getRadius()) {
        if (trigger.getOnActionBlockId()) {
          this.scriptMachine.jump(trigger.getOnActionBlockId());
          return;
        }        
      }
    }

    let direction = GWE.Utils.VEC3_CREATE(Math.cos(rotation[1]), 0, Math.sin(rotation[1]));
    let handPosition = GWE.Utils.VEC3_ADD(position, GWE.Utils.VEC3_SCALE(direction, radius + 0.5));

    for (let model of this.room.models) {
      if (GWE.Utils.VEC3_DISTANCE(model.getPosition(), handPosition) <= model.getRadius()) {
        if (model.getOnActionBlockId()) {
          this.scriptMachine.jump(model.getOnActionBlockId());
          return;
        }
      }
    }
  }

  utilsControllerMove(velocity) {
    let nextPosition = GWE.Utils.VEC3_ADD(this.room.controller.getPosition(), velocity);
    let radius = this.room.controller.getRadius();

    for (let other of this.room.models) {
      if (GWE.Utils.VEC3_DISTANCE(other.getPosition(), nextPosition) <= radius + other.getRadius()) {
        return;
      }
    }

    let p0Elevation = this.room.walkmesh.getElevationAt(nextPosition[0], nextPosition[2]);
    let p1Elevation = this.room.walkmesh.getElevationAt(nextPosition[0] - radius, nextPosition[2] - radius);
    let p2Elevation = this.room.walkmesh.getElevationAt(nextPosition[0] - radius, nextPosition[2] + radius);
    let p3Elevation = this.room.walkmesh.getElevationAt(nextPosition[0] + radius, nextPosition[2] - radius);
    let p4Elevation = this.room.walkmesh.getElevationAt(nextPosition[0] + radius, nextPosition[2] + radius);
    if (p0Elevation == Infinity || p1Elevation == Infinity || p2Elevation == Infinity || p3Elevation == Infinity || p4Elevation == Infinity) {
      return;
    }

    this.room.controller.setPosition([nextPosition[0], p0Elevation, nextPosition[2]]);

    for (let trigger of this.room.triggers) {
      let distance = GWE.Utils.VEC3_DISTANCE(trigger.getPosition(), nextPosition) <= radius + trigger.getRadius();
      if (trigger.getOnEnterBlockId() && !trigger.isHovered() && distance < radius + trigger.getRadius()) {
        this.scriptMachine.jump(trigger.getOnEnterBlockId());
        trigger.setHovered(true);
      }
      else if (trigger.getOnLeaveBlockId() && trigger.isHovered() && distance > radius + trigger.getRadius()) {
        this.scriptMachine.jump(trigger.getOnLeaveBlockId());
        trigger.setHovered(false);
      }
    }
  }

  $run() {
    this.running = true;
  }

  $stop() {
    this.running = false;
  }

  $waitPad() {
    this.scriptMachine.setEnabled(false);
    GWE.eventManager.subscribe(GWE.inputManager, 'E_KEYDOWN_ONCE', this, (data) => {
      if (data.key == GWE.InputKeyEnum.ENTER) {
        GWE.eventManager.unsubscribe(GWE.inputManager, 'E_KEYDOWN_ONCE', this);
        this.scriptMachine.setEnabled(true);
      } 
    });
  }

  $goto(jumpto) {
    return jumpto;
  }

  $gotoIf(varloc, cond, value, jumpto) {
    if (CHECK_CONDITION(this.player.getVariant(varloc), cond, value)) {
      return jumpto;
    }
  }

  $execIf(varloc, cond, value, cmd = { CommandName, CommandArgs }) {
    if (CHECK_CONDITION(this.player.getVariant(varloc), cond, value)) {
      this.scriptMachine.runCommand(cmd['CommandName'], cmd['CommandArgs']);
    }
  }

  $varSet(varloc, value) {
    this.player.setVariant(varloc, value);
  }

  $varAdd(varloc, value) {
    let variant = this.player.getVariant(varloc);
    this.player.setVariant(varloc, variant + value);
  }

  $varSub(varloc, value) {
    let variant = this.player.getVariant(varloc);
    this.player.setVariant(varloc, variant - value);
  }

  $delay(ms) {
    this.scriptMachine.setEnabled(false);
    window.setTimeout(() => this.scriptMachine.setEnabled(true), ms);
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

  $uiFadeIn(delay, ms, timingFunction) {
    this.scriptMachine.setEnabled(false);
    GWE.uiManager.fadeIn(delay, ms, timingFunction, () => this.scriptMachine.setEnabled(true));
  }

  $uiFadeOut(delay, ms, timingFunction) {
    this.scriptMachine.setEnabled(false);
    GWE.uiManager.fadeOut(delay, ms, timingFunction, () => this.scriptMachine.setEnabled(true));
  }

  $modelPlayMover(modelIndex, moverIndex) {
    let model = this.room.models[modelIndex];
    let mover = this.room.movers[moverIndex];
    mover.setDrawable(model);
    mover.play();
  }

  $modelPlayAnimation(modelIndex, animationName, isLooped) {
    let model = this.room.models[modelIndex];
    model.play(animationName, isLooped);
  }
}

module.exports.GameScreen = GameScreen;

// -------------------------------------------------------------------------------------------
// HELPFUL
// -------------------------------------------------------------------------------------------

function CHECK_CONDITION(value1, cond, value2) {
  return (cond == 'not equal' && value1 != value2) || (cond == 'equal' && value1 == value2) || (cond == 'is less than' && value1 < value2) || (cond == 'is greater than' && value1 > value2);
}
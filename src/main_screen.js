let { GWE } = require('gwe');
let { GameScreen } = require('./game_screen');

class MainScreen extends GWE.Screen {
  constructor(app) {
    super(app);
  }

  onEnter() {
    this.menuWidget = new GWE.UIMenuWidget({ columns: 2 });
    this.menuWidget.addItemWidget(new GWE.UIMenuTextWidget({ text: 'Jeu' }));
    this.menuWidget.addItemWidget(new GWE.UIMenuTextWidget({ text: 'Paramètres' }));
    this.menuWidget.addItemWidget(new GWE.UIMenuTextWidget({ text: 'Test1' }));
    this.menuWidget.addItemWidget(new GWE.UIMenuTextWidget({ text: 'Test2' }));
    GWE.uiManager.addWidget(this.menuWidget, 'position:absolute; top:50%; left:50%; transform:translate(-50%,-50%)');
    GWE.uiManager.focus(this.menuWidget);

    GWE.eventManager.subscribe(this.menuWidget, 'E_MENU_ITEM_SELECTED', this, this.handleMenuItemSelected);
  }

  onExit() {
    GWE.uiManager.removeWidget(this.menuWidget);
  }

  handleMenuItemSelected(data) {
    if (data.index == 0) {
      GWE.screenManager.requestSetScreen(new GameScreen(this.app));
    }
  }
}

module.exports.MainScreen = MainScreen;
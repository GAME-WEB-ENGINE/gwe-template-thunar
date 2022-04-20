window.addEventListener('load', async () => {
  let { GWE } = require('gwe');
  let { MainScreen } = require('./src/main_screen');

  let app = new GWE.Application(800, 800, GWE.SizeModeEnum.FIXED);
  GWE.screenManager.requestSetScreen(new MainScreen(app));
  requestAnimationFrame(ts => app.run(ts));
});
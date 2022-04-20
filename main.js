const { app, BrowserWindow } = require('electron');

app.whenReady().then(() => {
  createWindow()
});

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 800,
    maxWidth: 800,
    maxHeight: 800,
    resizable: false,
    useContentSize: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });

  win.setMenuBarVisibility(false)
  win.loadFile('index.html');
  win.openDevTools();
}
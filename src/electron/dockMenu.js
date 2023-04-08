const { app, Menu, Tray } = require('electron');

export function createDockMenu(win) {
  return Menu.buildFromTemplate([
    {
      label: 'Play',
      click() {
        win.webContents.send('play');
      },
    },
    { type: 'separator' },
    {
      label: 'Next',
      click() {
        win.webContents.send('next');
      },
    },
    {
      label: 'Previous',
      click() {
        win.webContents.send('previous');
      },
    },
  ]);
}
const contextMenu = Menu.buildFromTemplate([
  {
    label: 'Play',
    click: () => {
      // 播放音乐
    },
  },
  {
    label: 'Pause',
    click: () => {
      // 暂停音乐
    },
  },
  {
    label: 'Exit',
    click: () => {
      // 退出应用
      app.quit();
    },
  },
]);
app.whenReady().then(() => {
  Tray = new Tray(path.join(__dirname, 'tray-icon.png'));

  // 设置 Tray 的菜单
  Tray.setContextMenu(contextMenu);
});

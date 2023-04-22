const { app, Menu, Tray } = require('electron');
import path from 'path';

export function createDockMenu(win) {
  return Menu.buildFromTemplate([
    {
      label: '播放',
      click() {
        win.webContents.send('play');
      },
    },
    { type: 'separator' },
    {
      label: '下一首',
      click() {
        win.webContents.send('next');
      },
    },
    {
      label: '上一首',
      click() {
        win.webContents.send('previous');
      },
    },
  ]);
}
const contextMenu = Menu.buildFromTemplate([
  {
    label: '播放',
    click: () => {
      // 播放音乐
    },
  },
  {
    label: '暂停',
    click: () => {
      // 暂停音乐
    },
  },
  {
    label: '下一首',
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

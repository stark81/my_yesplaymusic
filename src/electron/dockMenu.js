const { Menu } = require('electron');

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

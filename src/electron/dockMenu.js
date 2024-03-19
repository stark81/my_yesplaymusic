import { app, Menu, ipcMain } from 'electron';

var isPlaying = false;

export function createDockMenu(win) {
  const updateDockMenu = () => {
    var template = [
      {
        label: isPlaying ? '暂停' : '播放',
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
    ];
    let dockMenu = Menu.buildFromTemplate(template);
    if (dockMenu && app.dock) app.dock.setMenu(dockMenu);
  };
  updateDockMenu();

  ipcMain.on('updateTrayPlayState', (_, playing) => {
    isPlaying = playing;
    updateDockMenu();
  });
}

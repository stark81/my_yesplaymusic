/* global __static */
import path from 'path';
import { app, nativeImage, Tray, Menu, nativeTheme } from 'electron';
import { isLinux, isMac } from '@/utils/platform';

let play_state = false;
let repeat_mode = 'off';
let shuffle_mode = false;

function createNativeImage(filename) {
  const isDarkMode = nativeTheme.shouldUseDarkColors;
  const name = isDarkMode ? `${filename}_white.png` : `${filename}_black.png`;
  return nativeImage.createFromPath(path.join(__static, `img/icons/${name}`));
}

function getIcon() {
  const isDarkMode = nativeTheme.shouldUseDarkColors;
  let iconPath = isDarkMode
    ? 'img/icons/menu@88.png'
    : 'img/icons/menu@88_dark.png';

  return nativeImage.createFromPath(path.join(__static, iconPath)).resize({
    height: 20,
    width: 20,
  });
}

function createMenuTemplate(win) {
  const template = isLinux
    ? [
        {
          label: '显示主面板',
          click: () => win.show(),
        },
        {
          type: 'separator',
        },
      ]
    : [];
  return template.concat([
    {
      label: '播放',
      icon: createNativeImage('play'),
      click: () => {
        win.webContents.send('play');
      },
      id: 'play',
      visible: !play_state,
    },
    {
      label: '暂停',
      icon: createNativeImage('pause'),
      click: () => {
        win.webContents.send('play');
      },
      id: 'pause',
      visible: play_state,
    },
    {
      label: '上一首',
      icon: createNativeImage('left'),
      click: () => {
        win.webContents.send('previous');
      },
    },
    {
      label: '下一首',
      icon: createNativeImage('right'),
      click: () => {
        win.webContents.send('next');
      },
    },
    {
      label: '循环播放',
      icon: createNativeImage('repeat'),
      submenu: [
        {
          label: '关闭循环',
          click: () => win.webContents.send('repeat', 'off'),
          id: 'off',
          checked: repeat_mode === 'off',
          type: 'radio',
        },
        {
          label: '列表循环',
          click: () => win.webContents.send('repeat', 'on'),
          id: 'on',
          checked: repeat_mode === 'on',
          type: 'radio',
        },
        {
          label: '单曲循环',
          click: () => win.webContents.send('repeat', 'one'),
          id: 'one',
          checked: repeat_mode === 'one',
          type: 'radio',
        },
        {
          label: '随机播放',
          click: item => win.webContents.send('repeat-shuffle', item.checked),
          id: 'shuffle',
          checked: shuffle_mode,
          type: 'checkbox',
        },
      ],
    },
    {
      label: '加入喜欢',
      icon: createNativeImage('like'),
      click: () => {
        win.webContents.send('like');
      },
      id: 'like',
    },
    {
      label: '取消喜欢',
      icon: createNativeImage('unlike'),
      click: () => {
        win.webContents.send('like');
      },
      id: 'unlike',
      visible: false,
    },
    {
      label: '退出',
      icon: createNativeImage('quit'),
      click: () => {
        app.exit();
      },
    },
  ]);
}

class YPMTrayImpl {
  constructor(win) {
    this._win = win;
    this.createTray();
    if (!isMac) this.setTooltip(app.name);
    this._tray.on('click', (event, bounds, position) => {
      if (isMac) {
        this._win.webContents.send('tray-click', { event, bounds, position });
      } else {
        this._win.show();
      }
    });
  }
  createTray() {
    if (isMac) {
      const tray = new Tray(nativeImage.createEmpty());
      global.setTray = function (img, width, height) {
        const image = nativeImage
          .createFromDataURL(img)
          .resize({ width, height });
        image.setTemplateImage(true);
        tray.setImage(image);
      };
      this._tray = tray;
    } else {
      let icon = getIcon();
      this._tray = new Tray(icon);
    }
  }
  setContextMenu() {
    this._template = createMenuTemplate(this._win);
    this._contextMenu = Menu.buildFromTemplate(this._template);
    this._tray.setContextMenu(this._contextMenu);
  }
  themeUpdate() {
    nativeTheme.on('updated', () => {
      let icon = getIcon();
      this._tray.setImage(icon);
      this.setContextMenu();
    });
  }
  setTooltip(text) {
    if (!isMac) this._tray.setToolTip(text);
  }
  setPlayState(isPlaying) {
    play_state = isPlaying;
    this._contextMenu.getMenuItemById('play').visible = !isPlaying;
    this._contextMenu.getMenuItemById('pause').visible = isPlaying;
    this._tray.setContextMenu(this._contextMenu);
  }
  setLikeState(isLiked) {
    this._contextMenu.getMenuItemById('like').visible = !isLiked;
    this._contextMenu.getMenuItemById('unlike').visible = isLiked;
    this._tray.setContextMenu(this._contextMenu);
  }

  setRepeatMode(repeatMode) {
    repeat_mode = repeatMode;
    this._contextMenu.getMenuItemById(repeat_mode).checked = true;
  }
  setShuffleMode(isShuffle) {
    shuffle_mode = isShuffle;
    this._contextMenu.getMenuItemById('shuffle').checked = isShuffle;
  }
}

export function createTray(win) {
  return new YPMTrayImpl(win);
}

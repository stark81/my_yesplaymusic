'use strict';
import {
  app,
  protocol,
  BrowserWindow,
  shell,
  dialog,
  globalShortcut,
  nativeTheme,
  screen,
} from 'electron';
import {
  isWindows,
  isMac,
  isLinux,
  isDevelopment,
  isCreateTray,
  isCreateMpris,
} from '@/utils/platform';
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib';
import { startNeteaseMusicApi } from './electron/services';
import { initIpcMain } from './electron/ipcMain.js';
import { createMenu } from './electron/menu';
import { createTray } from '@/electron/tray';
import { createTouchBar } from './electron/touchBar';
import { createDockMenu } from './electron/dockMenu';
import { getLyrics } from './electron/utils';
import { registerGlobalShortcut } from './electron/globalShortcut';
import { autoUpdater } from 'electron-updater';
import installExtension, { VUEJS_DEVTOOLS } from 'electron-devtools-installer';
// import { EventEmitter } from 'events';
import express from 'express';
import expressProxy from 'express-http-proxy';
import Store from 'electron-store';
import { createMpris } from '@/electron/mpris';
import { release, type } from 'os';
import { parseFile } from 'music-metadata';

const clc = require('cli-color');
const log = text => {
  console.log(`${clc.blueBright('[background.js]')} ${text}`);
};

const closeOnLinux = (e, win, store) => {
  let closeOpt = store.get('settings.closeAppOption');
  if (closeOpt !== 'exit') {
    e.preventDefault();
  }

  if (closeOpt === 'ask') {
    dialog
      .showMessageBox({
        type: 'info',
        title: 'Information',
        cancelId: 2,
        defaultId: 0,
        message: '确定要关闭吗？',
        buttons: ['最小化到托盘', '直接退出'],
        checkboxLabel: '记住我的选择',
      })
      .then(result => {
        if (result.checkboxChecked && result.response !== 2) {
          win.webContents.send(
            'rememberCloseAppOption',
            result.response === 0 ? 'minimizeToTray' : 'exit'
          );
        }

        if (result.response === 0) {
          win.hide(); //调用 最小化实例方法
        } else if (result.response === 1) {
          win = null;
          app.exit(); //exit()直接关闭客户端，不会执行quit();
        }
      })
      .catch(err => {
        log(err);
      });
  } else if (closeOpt === 'exit') {
    win = null;
    app.quit();
  } else {
    win.hide();
  }
};

class Background {
  constructor() {
    this.window = null;
    this.osdlyrics = null;
    this.ypmTrayImpl = null;
    this.store = new Store({
      windowWidth: {
        width: { type: 'number', default: 1440 },
        height: { type: 'number', default: 840 },
      },
    });
    this.neteaseMusicAPI = null;
    this.expressApp = null;
    this.willQuitApp = !isMac;

    this.init();
  }

  init() {
    log('initializing');

    // Make sure the app is singleton.
    if (release().startsWith('6.1') && type() == 'Windows_NT')
      app.disableHardwareAcceleration();
    if (process.platform === 'win32') app.setAppUserModelId(app.getName());
    if (!app.requestSingleInstanceLock()) return app.quit();

    // start netease music api
    this.neteaseMusicAPI = startNeteaseMusicApi();

    // create Express app
    this.createExpressApp();

    // Scheme must be registered before the app is ready
    protocol.registerSchemesAsPrivileged([
      { scheme: 'app', privileges: { secure: true, standard: true } },
      {
        scheme: 'atom',
        privileges: {
          secure: true,
          standard: true,
          supportFetchAPI: true,
          stream: true,
        },
      },
    ]);

    // handle app events
    this.handleAppEvents();

    // disable chromium mpris
    if (isCreateMpris) {
      app.commandLine.appendSwitch(
        'disable-features',
        'HardwareMediaKeyHandling,MediaSessionService'
      );
    }
  }

  async initDevtools() {
    // Install Vue Devtools extension
    try {
      await installExtension(VUEJS_DEVTOOLS);
    } catch (e) {
      console.error('Vue Devtools failed to install:', e.toString());
    }

    // Exit cleanly on request from parent process in development mode.
    if (isWindows) {
      process.on('message', data => {
        if (data === 'graceful-exit') {
          app.quit();
        }
      });
    } else {
      process.on('SIGTERM', () => {
        app.quit();
      });
    }
  }

  createExpressApp() {
    log('creating express app');

    const expressApp = express();
    expressApp.use('/', express.static(__dirname + '/'));
    expressApp.use('/api', expressProxy('http://127.0.0.1:10754'));
    expressApp.use('/player', (req, res) => {
      this.window.webContents
        .executeJavaScript('window.yesplaymusic.player')
        .then(result => {
          const player = {
            currentTrack: result._isPersonalFM
              ? result._personalFMTrack
              : result._currentTrack,
            progress: result._progress,
          };
          res.send(player);
        });
    });
    this.expressApp = expressApp.listen(27232, '127.0.0.1');
  }

  createWindow() {
    log('creating app window');

    const appearance = this.store.get('settings.appearance');
    const showLibraryDefault = this.store.get('settings.showLibraryDefault');

    const options = {
      x: this.store.get('window.x'),
      y: this.store.get('window.y'),
      width: this.store.get('window.width') || 1440,
      height: this.store.get('window.height') || 840,
      minWidth: 1080,
      minHeight: 720,
      titleBarStyle: 'hiddenInset',
      frame: !(
        isWindows ||
        (isLinux && this.store.get('settings.linuxEnableCustomTitlebar'))
      ),
      title: 'YesPlayMusic',
      show: false,
      webPreferences: {
        webSecurity: false,
        nodeIntegration: true,
        enableRemoteModule: true,
        contextIsolation: false,
      },
      backgroundColor:
        ((appearance === undefined || appearance === 'auto') &&
          nativeTheme.shouldUseDarkColors) ||
        appearance === 'dark'
          ? '#222'
          : '#fff',
    };

    if (this.store.get('window.x') && this.store.get('window.y')) {
      let x = this.store.get('window.x');
      let y = this.store.get('window.y');

      let displays = screen.getAllDisplays();
      let isResetWindiw = false;
      if (displays.length === 1) {
        let { bounds } = displays[0];
        if (
          x < bounds.x ||
          x > bounds.x + bounds.width - 50 ||
          y < bounds.y ||
          y > bounds.y + bounds.height - 50
        ) {
          isResetWindiw = true;
        }
      } else {
        isResetWindiw = true;
        for (let i = 0; i < displays.length; i++) {
          let { bounds } = displays[i];
          if (
            x > bounds.x &&
            x < bounds.x + bounds.width &&
            y > bounds.y &&
            y < bounds.y - bounds.height
          ) {
            // 检测到APP窗口当前处于一个可用的屏幕里，break
            isResetWindiw = false;
            break;
          }
        }
      }

      if (!isResetWindiw) {
        options.x = x;
        options.y = y;
      }
    }

    this.window = new BrowserWindow(options);

    // hide menu bar on Microsoft Windows and Linux
    this.window.setMenuBarVisibility(false);

    if (process.env.WEBPACK_DEV_SERVER_URL) {
      // Load the url of the dev server if in development mode
      this.window.loadURL(
        showLibraryDefault
          ? `${process.env.WEBPACK_DEV_SERVER_URL}/#/library`
          : process.env.WEBPACK_DEV_SERVER_URL
      );
      if (!process.env.IS_TEST) this.window.webContents.openDevTools();
    } else {
      createProtocol('app');
      this.window.loadURL(
        showLibraryDefault
          ? 'http://localhost:27232/#/library'
          : 'http://localhost:27232'
      );
    }
  }

  createOSDWindow() {
    this.osdlyrics = new BrowserWindow({
      x: this.store.get('osdlyrics.x_pos') || 0,
      y: this.store.get('osdlyrics.y_pos') || 0,
      width: this.store.get('osdlyrics.width') || 840,
      height: this.store.get('osdlyrics.height') || 110,
      transparent: true,
      // backgroundColor: '#00000000',
      frame: false,
      // show: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      hiddenInMissionControl: true,
      hasShadow: false,
      title: 'YesPlayMusic-桌面歌词',
      webPreferences: {
        webSecurity: false,
        nodeIntegration: true,
        enableRemoteModule: true,
        contextIsolation: false,
      },
    });

    this.osdlyrics.setVisibleOnAllWorkspaces(true);
    if (process.env.WEBPACK_DEV_SERVER_URL) {
      // Load the url of the dev server if in development mode
      this.osdlyrics.loadURL(
        `${process.env.WEBPACK_DEV_SERVER_URL}/osdlyric.html`
      );
    } else {
      createProtocol('app');
      this.osdlyrics.loadURL('http://localhost:27232/osdlyric.html');
    }
  }

  initOSDLyrics() {
    const osdState = this.store.get('osdlyrics.show') || false;
    if (osdState) {
      this.showOSDLyrics();
    }
  }

  toggleOSDLyrics() {
    const osdState = this.store.get('osdlyrics.show') || false;
    if (osdState) {
      this.hideOSDLyrics();
    } else {
      this.showOSDLyrics();
    }
  }

  receiveLyric(arg) {
    if (this.osdlyrics) {
      this.osdlyrics.webContents.send('lyric', arg);
    }
  }

  sendLyricIndex(idx) {
    if (this.osdlyrics) {
      this.osdlyrics.webContents.send('index', idx);
    }
  }

  showOSDLyrics() {
    this.store.set('osdlyrics.show', true);
    if (!this.osdlyrics) {
      this.createOSDWindow();
      this.handleOSDEvents();
    }
  }

  hideOSDLyrics() {
    this.store.set('osdlyrics.show', false);
    if (this.osdlyrics) {
      this.osdlyrics.close();
    }
  }

  resizeOSDLyrics(height) {
    const width = this.store.get('osdlyrics.width') || 840;
    this.osdlyrics.setSize(width, height);
  }

  checkForUpdates() {
    if (isDevelopment) return;
    log('checkForUpdates');
    autoUpdater.checkForUpdatesAndNotify();

    const showNewVersionMessage = info => {
      dialog
        .showMessageBox({
          title: '发现新版本 v' + info.version,
          message: '发现新版本 v' + info.version,
          detail: '是否前往 GitHub 下载新版本安装包？',
          buttons: ['下载', '取消'],
          type: 'question',
          noLink: true,
        })
        .then(result => {
          if (result.response === 0) {
            shell.openExternal(
              'https://github.com/stark81/my_yesplaymusic/releases/'
            );
          }
        });
    };

    autoUpdater.on('update-available', info => {
      showNewVersionMessage(info);
    });
  }

  handleOSDEvents() {
    this.osdlyrics.once('ready-to-show', () => {
      const osdState = this.store.get('osdlyrics.show') || false;
      if (osdState) {
        this.osdlyrics.showInactive();
      }
    });

    this.osdlyrics.on('closed', () => {
      log('OSD close event');
      this.osdlyrics = null;
    });

    this.osdlyrics.on('resize', () => {
      let { height, width } = this.osdlyrics.getBounds();
      this.store.set('osdlyrics.width', width);
      this.store.set('osdlyrics.height', height);
    });

    this.osdlyrics.on('move', () => {
      var pos = this.osdlyrics.getPosition();
      this.store.set('osdlyrics.x_pos', pos[0]);
      this.store.set('osdlyrics.y_pos', pos[1]);
    });
  }

  handleWindowEvents() {
    this.window.once('ready-to-show', () => {
      log('window ready-to-show event');
      this.window.show();
      this.store.set('window', this.window.getBounds());
    });

    this.window.on('close', e => {
      log('window close event');

      if (isLinux) {
        closeOnLinux(e, this.window, this.store);
      } else if (isMac) {
        if (this.willQuitApp) {
          this.window = null;
          app.quit();
        } else {
          e.preventDefault();
          this.window.hide();
        }
      } else {
        let closeOpt = this.store.get('settings.closeAppOption');
        if (this.willQuitApp && (closeOpt === 'exit' || closeOpt === 'ask')) {
          this.window = null;
          app.quit();
        } else {
          e.preventDefault();
          this.window.hide();
        }
      }
    });

    this.window.on('resize', () => {
      this.store.set('window', this.window.getBounds());
    });

    this.window.on('move', () => {
      var pos = this.window.getPosition();
      this.store.set('window.x', pos[0]);
      this.store.set('window.y', pos[1]);
    });

    this.window.on('maximize', () => {
      this.window.webContents.send('isMaximized', true);
    });

    this.window.on('unmaximize', () => {
      this.window.webContents.send('isMaximized', false);
    });

    this.window.webContents.on('new-window', function (e, url) {
      e.preventDefault();
      log('open url');
      const excludeHosts = ['www.last.fm'];
      const exclude = excludeHosts.find(host => url.includes(host));
      if (exclude) {
        const newWindow = new BrowserWindow({
          width: 800,
          height: 600,
          titleBarStyle: 'default',
          title: 'YesPlayMusic',
          webPreferences: {
            webSecurity: false,
            nodeIntegration: true,
            enableRemoteModule: true,
            contextIsolation: false,
          },
        });
        newWindow.loadURL(url);
        return;
      }
      shell.openExternal(url);
    });
  }

  handleProtocol() {
    protocol.registerBufferProtocol('atom', async (request, callback) => {
      const { host, pathname } = new URL(request.url);
      if (host === 'get-pic') {
        const filePath = pathname.slice(1);
        const metadata = await parseFile(decodeURI(filePath));
        let pic, format;
        if (metadata.common.picture && metadata.common.picture.length > 0) {
          pic = metadata.common.picture[0].data;
          format = metadata.common.picture[0].format;
          callback({ mimeType: format, data: pic });
        } else {
          const https = require('https');
          https.get(
            'https://p2.music.126.net/UeTuwE7pvjBpypWLudqukA==/3132508627578625.jpg',
            res => {
              let data = [];
              res.on('data', chunk => {
                data.push(chunk);
              });
              res.on('end', () => {
                const buffer = Buffer.concat(data);
                callback({
                  data: buffer,
                  mimeType: res.headers['content-type'],
                });
              });
            }
          );
        }
      } else if (host === 'get-lyric') {
        const filePath = pathname.slice(1);
        const metadata = await parseFile(decodeURI(filePath));
        const lyric = getLyrics(metadata);
        callback({
          mimeType: 'application/json',
          data: Buffer.from(JSON.stringify(lyric)),
        });
      }
    });
  }

  handleAppEvents() {
    app.on('ready', async () => {
      // This method will be called when Electron has finished
      // initialization and is ready to create browser windows.
      // Some APIs can only be used after this event occurs.
      log('app ready event');

      this.handleProtocol();

      // for development
      if (isDevelopment) {
        this.initDevtools();
      }

      // create window
      this.createWindow();
      this.window.once('ready-to-show', () => {
        this.window.show();
      });
      this.handleWindowEvents();

      this.initOSDLyrics();

      // create tray
      if (isCreateTray) {
        this.ypmTrayImpl = createTray(this.window);
      }

      // init ipcMain
      initIpcMain(this.window, this.store, this.ypmTrayImpl, {
        resizeOSDLyrics: height => this.resizeOSDLyrics(height),
        toggleOSDLyrics: () => this.toggleOSDLyrics(),
        receiveLyric: lyric => this.receiveLyric(lyric),
        sendLyricIndex: index => this.sendLyricIndex(index),
      });

      // set proxy
      const proxyRules = this.store.get('proxy');
      if (proxyRules) {
        this.window.webContents.session.setProxy({ proxyRules }, result => {
          log('finished setProxy', result);
        });
      }

      // check for updates
      this.checkForUpdates();

      // create menu
      createMenu(this.window, this.store);

      // create dock menu for macOS
      createDockMenu(this.window);

      // create touch bar
      createTouchBar(this.window);
      // if (createdTouchBar) this.window.setTouchBar(createdTouchBar);

      // register global shortcuts
      if (this.store.get('settings.enableGlobalShortcut') !== false) {
        registerGlobalShortcut(this.window, this.store);
      }

      // create mpris
      if (isCreateMpris) {
        createMpris(this.window);
      }
    });

    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      log('app activate event');
      if (this.window === null) {
        this.createWindow();
      } else {
        this.window.show();
      }
    });

    app.on('window-all-closed', () => {
      if (!isMac) {
        app.quit();
      }
    });

    app.on('before-quit', () => {
      this.willQuitApp = true;
    });

    app.on('quit', () => {
      this.expressApp.close();
    });

    app.on('will-quit', () => {
      // unregister all global shortcuts
      globalShortcut.unregisterAll();
    });

    if (!isMac) {
      app.on('second-instance', () => {
        if (this.window) {
          this.window.show();
          if (this.window.isMinimized()) {
            this.window.restore();
          }
          this.window.focus();
        }
      });
    }
  }
}

new Background();

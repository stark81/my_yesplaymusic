import { app, dialog, globalShortcut, ipcMain } from 'electron';
// import UNM from '@unblockneteasemusic/rust-napi';
import { registerGlobalShortcut } from '@/electron/globalShortcut';
import cloneDeep from 'lodash/cloneDeep';
import shortcuts from '@/utils/shortcuts';
import { createMenu } from './menu';
import { createDBus } from './dbus-client';
import { isCreateTray, isMac, isLinux } from '@/utils/platform';
import { parseFile } from 'music-metadata';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const clc = require('cli-color');
const log = text => {
  console.log(`${clc.blueBright('[ipcMain.js]')} ${text}`);
};

const createMD5 = filePath => {
  const hash = crypto.createHash('md5');
  const data = fs.readFileSync(filePath);
  hash.update(data);
  return hash.digest('hex');
};

const splitArtist = artist => {
  if (!artist) return ['未知歌手'];
  let result = [];
  if (artist.includes('&')) {
    result = artist.split('&');
  } else if (artist.includes('、')) {
    result = artist.split('、');
  } else if (artist.includes(',')) {
    result = artist.split(',');
  } else if (artist.includes('/')) {
    result = artist.split('/');
  } else {
    result = [artist];
  }
  return result;
};

let isLock = false;

const exitAsk = (e, win) => {
  e.preventDefault(); //阻止默认行为
  dialog
    .showMessageBox({
      type: 'info',
      title: 'Information',
      cancelId: 2,
      defaultId: 0,
      message: '确定要关闭吗？',
      buttons: ['最小化', '直接退出'],
    })
    .then(result => {
      if (result.response == 0) {
        e.preventDefault(); //阻止默认行为
        win.minimize(); //调用 最小化实例方法
      } else if (result.response == 1) {
        win = null;
        //app.quit();
        app.exit(); //exit()直接关闭客户端，不会执行quit();
      }
    })
    .catch(err => {
      log(err);
    });
};

const exitAskWithoutMac = (e, win) => {
  e.preventDefault(); //阻止默认行为
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
        e.preventDefault(); //阻止默认行为
        win.hide(); //调用 最小化实例方法
      } else if (result.response === 1) {
        win = null;
        //app.quit();
        app.exit(); //exit()直接关闭客户端，不会执行quit();
      }
    })
    .catch(err => {
      log(err);
    });
};

const client = require('discord-rich-presence')('818936529484906596');

const initWindowIpcMain = (win, store) => {
  ipcMain.on('close', e => {
    if (isMac) {
      win.hide();
      exitAsk(e, win);
    } else {
      let closeOpt = store.get('settings.closeAppOption');
      if (closeOpt === 'exit') {
        win = null;
        //app.quit();
        app.exit(); //exit()直接关闭客户端，不会执行quit();
      } else if (closeOpt === 'minimizeToTray') {
        e.preventDefault();
        win.hide();
      } else {
        exitAskWithoutMac(e, win);
      }
    }
  });

  ipcMain.handle(
    'unblock-music',
    /**
     *
     * @param {*} _
     * @param {string | null} sourceListString
     * @param {Record<string, any>} ncmTrack
     * @param {UNM.Context} context
     */
    async (_, sourceListString, ncmTrack) => {
      const sourceList = sourceListString
        .split(',')
        .map(s => s.trim().toLowerCase());
      // console.log(sourceList, ncmTrack, context);
      const match = require('@unblockneteasemusic/server');
      const result = await match(ncmTrack.id, sourceList);
      return result;
    }
  );

  ipcMain.on('minimize', () => {
    win.minimize();
  });

  ipcMain.on('maximizeOrUnmaximize', () => {
    win.isMaximized() ? win.unmaximize() : win.maximize();
  });

  ipcMain.on('setProxy', (event, config) => {
    const proxyRules = `${config.protocol}://${config.server}:${config.port}`;
    store.set('proxy', proxyRules);
    win.webContents.session.setProxy(
      {
        proxyRules,
      },
      () => {
        log('finished setProxy');
      }
    );
  });

  ipcMain.on('removeProxy', () => {
    log('removeProxy');
    win.webContents.session.setProxy({});
    store.set('proxy', '');
  });
};

const initOsdWinIpcMain = (win, store, lrc) => {
  ipcMain.on('toggleOSDLyrics', (event, show) => {
    store.set('osdlyrics.show', show);
    lrc.toggleOSDLyrics();
  });

  ipcMain.on('sendLyrics', (_, arg) => {
    lrc.receiveLyric(arg);
    // 这里可以看看是否可以使用emit事件来避免需要主进城来控制状态栏歌词更新
    if (isCreateTray) win.webContents.send('lyricsReceived', arg[0]);
  });

  ipcMain.on('from-osd', (_, arg) => {
    if (arg === 'showMainWin') {
      win.show();
    } else if (arg === 'playPrev') {
      win.webContents.send('previous');
    } else if (arg === 'playNext') {
      win.webContents.send('next');
    } else if (arg === 'playOrPause') {
      win.webContents.send('play');
    }
  });
  ipcMain.on('set-osd-window', (_, data) => {
    const [key, value] = Object.entries(data)[0];
    store.set(`osdlyrics.${key}`, value);
    if (key === 'isLock') {
      isLock = value;
      lrc.toggleMouseIgnore();
    } else if (key === 'type') {
      lrc.switchOSDWindow(value);
    } else if (key === 'show') {
      win.webContents.send('updateOSDShow', value);
      lrc.toggleOSDLyrics();
    }
  });
  ipcMain.on('set-ignore-mouse', (e, isLock) => {
    store.set('osdlyrics.isLock', isLock);
    lrc.toggleMouseIgnore();
  });
  ipcMain.on('mouseleave', () => {
    store.set('osdlyrics.isLock', isLock);
    lrc.toggleMouseIgnore();
  });
  ipcMain.on('lyricIndex', (_, index) => {
    lrc.sendLyricIndex(index);
  });

  // ipcMain.on('resizeOSDLyrics', (event, arg) => {
  //   lrc.resizeOSDLyrics(arg);
  // });
};

const initPlayerIpcMain = () => {};

const initMprisIpcMain = () => {};

const initOtherIpcMain = win => {
  let songs = [];
  ipcMain.on('currentLocalMusic', (event, arg) => {
    songs = arg;
  });
  ipcMain.on('msgScanLocalMusic', async (event, filePath) => {
    if (!filePath) return;
    const musicFileExtensions = /\.(mp3|aiff|flac|alac|m4a|aac|wav)$/i;

    const albums = songs.map(song => song.album);
    const artists = songs.map(song => song.artist).flat();
    const newTracks = [];
    const newAlbums = [];
    const newArtists = [];

    const walk = async dir => {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isFile() && musicFileExtensions.test(filePath)) {
          const foundTrack = songs.find(track => track.filePath === filePath);
          if (!foundTrack) {
            const md5 = createMD5(filePath);
            const metadata = await parseFile(filePath);
            const birthDate = new Date(stat.birthtime).getTime();
            const { common, format } = metadata;

            // 获取艺术家信息
            const arIDsResult = [];
            const arts = splitArtist(common.albumartist || common.artist);
            for (const art of arts) {
              const foundArtist = [...artists, ...newArtists].find(
                a => a.name === art
              );
              if (foundArtist) {
                arIDsResult.push(foundArtist);
              } else {
                const artist = {
                  id: artists.length + newArtists.length + 1,
                  name: art,
                  matched: false,
                  picUrl:
                    'https://p1.music.126.net/VnZiScyynLG7atLIZ2YPkw==/18686200114669622.jpg',
                };
                arIDsResult.push(artist);
                newArtists.push(artist);
              }
            }

            // 获取专辑信息
            let album = [...albums, ...newAlbums].find(
              al => al.name === common.album
            );
            if (!album) {
              album = {
                id: albums.length + newAlbums.length + 1,
                name: common.album || 'Unknown Album',
                matched: false,
                picUrl:
                  'https://p2.music.126.net/UeTuwE7pvjBpypWLudqukA==/3132508627578625.jpg',
              };
              newAlbums.push(album);
            }

            // 获取歌曲信息
            const song = {
              id: songs.length + newTracks.length + 1,
              name: common.title || 'Unknown Title',
              dt: (format.duration || 0) * 1000,
              filePath,
              isLocal: true,
              matched: false,
              offset: 0,
              md5,
              createTime: birthDate,
              alias: [],
              al: album,
              ar: arIDsResult,
              picUrl:
                'https://p2.music.126.net/UeTuwE7pvjBpypWLudqukA==/3132508627578625.jpg',
            };
            win.webContents.send('msgHandleScanLocalMusic', { song });
            newTracks.push(song);
          }
        } else if (stat.isDirectory()) {
          await walk(filePath);
        }
      }
    };
    await walk(filePath);
    win.webContents.send('scanLocalMusicDone');
  });
};

export function initIpcMain(win, store, tray, lrc) {
  isLock = store.get('osdlyrics.isLock');
  initWindowIpcMain(win, store);
  initOsdWinIpcMain(win, store, lrc);
  initPlayerIpcMain();
  initMprisIpcMain();
  initOtherIpcMain(win);

  ipcMain.on('settings', (event, options) => {
    store.set('settings', options);
    if (options.enableGlobalShortcut) {
      registerGlobalShortcut(win, store);
    } else {
      log('unregister global shortcut');
      globalShortcut.unregisterAll();
    }
  });

  ipcMain.on('playDiscordPresence', (event, track) => {
    client.updatePresence({
      details: track.name + ' - ' + track.ar.map(ar => ar.name).join(','),
      state: track.al.name,
      endTimestamp: Date.now() + track.dt,
      largeImageKey: track.al.picUrl,
      largeImageText: track.al.name,
      smallImageKey: 'play',
      smallImageText: 'Playing',
      instance: true,
    });
  });

  ipcMain.on('pauseDiscordPresence', (event, track) => {
    client.updatePresence({
      details: track.name + ' - ' + track.ar.map(ar => ar.name).join(','),
      state: track.al.name,
      largeImageKey: track.al.picUrl,
      largeImageText: track.al.name,
      smallImageKey: 'pause',
      smallImageText: 'Pause',
      instance: true,
    });
  });

  ipcMain.on('switchGlobalShortcutStatusTemporary', (e, status) => {
    log('switchGlobalShortcutStatusTemporary');
    if (status === 'disable') {
      globalShortcut.unregisterAll();
    } else {
      registerGlobalShortcut(win, store);
    }
  });

  ipcMain.on('updateShortcut', (e, { id, type, shortcut }) => {
    log('updateShortcut');
    let shortcuts = store.get('settings.shortcuts');
    let newShortcut = shortcuts.find(s => s.id === id);
    newShortcut[type] = shortcut;
    store.set('settings.shortcuts', shortcuts);

    createMenu(win, store);
    globalShortcut.unregisterAll();
    registerGlobalShortcut(win, store);
  });

  ipcMain.on('restoreDefaultShortcuts', () => {
    log('restoreDefaultShortcuts');
    store.set('settings.shortcuts', cloneDeep(shortcuts));

    createMenu(win, store);
    globalShortcut.unregisterAll();
    registerGlobalShortcut(win, store);
  });

  if (isCreateTray) {
    const show_menu = isMac
      ? store.get('settings.showLyricsMenu') &&
        !store.get('settings.showStatusBarLyric') &&
        !store.get('settings.showControl')
      : true;
    if (show_menu) {
      tray.setContextMenu();
      tray.themeUpdate();
    }
    ipcMain.on('enableTrayMenu', (_, isEnable) => {
      if (isEnable) {
        tray.setContextMenu();
        tray.themeUpdate();
      } else {
        tray._tray.setContextMenu(null);
      }
    });
    ipcMain.on('updateTrayTooltip', (_, title) => {
      tray.setTooltip(title);
    });
    ipcMain.on('updateTrayPlayState', (_, isPlaying) => {
      const show_menu = isMac
        ? store.get('settings.showLyricsMenu') &&
          !store.get('settings.showStatusBarLyric') &&
          !store.get('settings.showControl')
        : true;
      if (show_menu) tray.setPlayState(isPlaying);
      if (isMac) win.webContents.send('changeTrayPlayingStatus');
      lrc.updateOSDPlayingState(isPlaying);
    });
    ipcMain.on('updateTray', (_, { img, width, height }) => {
      tray.updateTray(img, width, height);
    });
    ipcMain.on('updateTrayLikeState', (_, isLiked) => {
      const show_menu = isMac
        ? store.get('settings.showLyricsMenu') &&
          !store.get('settings.showStatusBarLyric') &&
          !store.get('settings.showControl')
        : true;
      if (show_menu) tray.setLikeState(isLiked);
      if (isMac) win.webContents.send('changeTrayLikeStatus');
    });
    ipcMain.on('switchRepeatMode', (_, repeatMode) => {
      const show_menu = isMac
        ? store.get('settings.showLyricsMenu') &&
          !store.get('settings.showStatusBarLyric') &&
          !store.get('settings.showControl')
        : true;
      if (show_menu) tray.setRepeatMode(repeatMode);
    });
    ipcMain.on('switchShuffle', (_, shuffleMode) => {
      const show_menu = isMac
        ? store.get('settings.showLyricsMenu') &&
          !store.get('settings.showStatusBarLyric') &&
          !store.get('settings.showControl')
        : true;
      if (show_menu) tray.setShuffleMode(shuffleMode);
    });
    ipcMain.on('windowShow', () => {
      win.show();
    });
    ipcMain.on('switchShowTray', (_, ops) => {
      win.webContents.send('switchShowTray', ops);
    });
    ipcMain.handle('selected-folder', async () => {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
      });
      if (!result.canceled) {
        return result.filePaths[0];
      } else {
        return null;
      }
    });

    if (isLinux) {
      const busName = 'org.gnome.Shell.TrayLyric';
      const dbus = createDBus(busName, win);

      ipcMain.handle('checkExtensionStatus', () => {
        return dbus.status || false;
      });

      ipcMain.on('updateCurrentLyric', (_, data) => {
        data.sender = 'YesPlayMusic';
        dbus.iface.UpdateLyric(JSON.stringify(data));
      });
    }
  }
}

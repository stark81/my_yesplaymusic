import { app, dialog, globalShortcut, ipcMain } from 'electron';
// import UNM from '@unblockneteasemusic/rust-napi';
import { registerGlobalShortcut } from '@/electron/globalShortcut';
import cloneDeep from 'lodash/cloneDeep';
import shortcuts from '@/utils/shortcuts';
import { createMenu } from './menu';
import { createDBus } from './dbus-client';
import { isCreateTray, isMac, isLinux } from '@/utils/platform';

let lyrics;
let lyricIdx;
const clc = require('cli-color');
const log = text => {
  console.log(`${clc.blueBright('[ipcMain.js]')} ${text}`);
};

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

/**
 * Make data a Buffer.
 *
 * @param {?} data The data to convert.
 * @returns {import("buffer").Buffer} The converted data.
 */
// function toBuffer(data) {
//   if (data instanceof Buffer) {
//     return data;
//   } else {
//     return Buffer.from(data);
//   }
// }

/**
 * Get the file base64 data from bilivideo.
 *
 * @param {string} url The URL to fetch.
 * @returns {Promise<string>} The file base64 data.
 */
// async function getBiliVideoFile(url) {
//   const axios = await import('axios').then(m => m.default);
//   const response = await axios.get(url, {
//     headers: {
//       Referer: 'https://www.bilibili.com/',
//       'User-Agent': 'okhttp/3.4.1',
//     },
//     responseType: 'arraybuffer',
//   });

//   const buffer = toBuffer(response.data);
//   const encodedData = buffer.toString('base64');

//   return encodedData;
// }

/**
 * Parse the source string (`a, b`) to source list `['a', 'b']`.
 *
 * @param {import("@unblockneteasemusic/rust-napi").Executor} executor
 * @param {string} sourceString The source string.
 * @returns {string[]} The source list.
 */
// function parseSourceStringToList(executor, sourceString) {
//   const availableSource = executor.list();

//   return sourceString
//     .split(',')
//     .map(s => s.trim().toLowerCase())
//     .filter(s => {
//       const isAvailable = availableSource.includes(s);

//       if (!isAvailable) {
//         log(`This source is not one of the supported source: ${s}`);
//       }

//       return isAvailable;
//     });
// }

export function initIpcMain(win, store, tray, lrc) {
  // WIP: Do not enable logging as it has some issues in non-blocking I/O environment.
  // UNM.enableLogging(UNM.LoggingType.ConsoleEnv);
  // const unmExecutor = new UNM.Executor();

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
    // async (_, sourceListString, ncmTrack, context) => {
    //   // Formt the track input
    //   // FIXME: Figure out the structure of Track
    //   const song = {
    //     id: ncmTrack.id && ncmTrack.id.toString(),
    //     name: ncmTrack.name,
    //     duration: ncmTrack.dt,
    //     album: ncmTrack.al && {
    //       id: ncmTrack.al.id && ncmTrack.al.id.toString(),
    //       name: ncmTrack.al.name,
    //     },
    //     artists: ncmTrack.ar
    //       ? ncmTrack.ar.map(({ id, name }) => ({
    //           id: id && id.toString(),
    //           name,
    //         }))
    //       : [],
    //   };

    //   const sourceList =
    //     typeof sourceListString === 'string'
    //       ? parseSourceStringToList(unmExecutor, sourceListString)
    //       : ['ytdl', 'bilibili', 'pyncm', 'kugou'];
    //   log(`[UNM] using source: ${sourceList.join(', ')}`);
    //   log(`[UNM] using configuration: ${JSON.stringify(context)}`);

    //   try {
    //     // TODO: tell users to install yt-dlp.
    //     const matchedAudio = await unmExecutor.search(
    //       sourceList,
    //       song,
    //       context
    //     );
    //     const retrievedSong = await unmExecutor.retrieve(matchedAudio, context);

    //     // bilibili's audio file needs some special treatment
    //     if (retrievedSong.url.includes('bilivideo.com')) {
    //       retrievedSong.url = await getBiliVideoFile(retrievedSong.url);
    //     }

    //     log(`respond with retrieve song…`);
    //     log(JSON.stringify(matchedAudio));
    //     return retrievedSong;
    //   } catch (err) {
    //     const errorMessage = err instanceof Error ? `${err.message}` : `${err}`;
    //     log(`UnblockNeteaseMusic failed: ${errorMessage}`);
    //     return null;
    //   }
    // }
  );

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

  ipcMain.on('minimize', () => {
    win.minimize();
  });

  ipcMain.on('maximizeOrUnmaximize', () => {
    win.isMaximized() ? win.unmaximize() : win.maximize();
  });

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

  ipcMain.on('resizeOSDLyrics', (event, arg) => {
    lrc.resizeOSDLyrics(arg);
  });

  ipcMain.on('toggleOSDLyrics', () => {
    lrc.toggleOSDLyrics();
  });
  ipcMain.on('sendLyrics', (_, arg) => {
    lyrics = arg;
    lrc.receiveLyric(arg);
    if (isCreateTray) win.webContents.send('lyricsReceived', arg[0]);
  });
  ipcMain.handle('onloadLyric', () => {
    return [lyrics, lyricIdx];
  });
  ipcMain.on('lyricIndex', (_, index) => {
    lyricIdx = index;
    lrc.sendLyricIndex(index);
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

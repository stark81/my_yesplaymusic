import { ipcRenderer, remote } from 'electron';
import eventBus from '@/utils/eventBus';
import { Lyric, Control, Canvas } from '@/utils/trayCanvas';

import previous from './assets/skip_previous.png';
import playing from './assets/play_arrow.png';
import next from './assets/skip_next.png';
import paused from './assets/pause.png';
import liked from './assets/like.png';
import like_solid from './assets/like_fill.png';
import tray_icon from './assets/icon.png';
import thumbs_down from './assets/thumbs_down.png';

import store from '@/store';
const player = store.state.player;

let trayShow = store.state.settings.showTray;
let controlShow = trayShow && store.state.settings.showControl;
let lyricShow = trayShow && store.state.settings.showStatusBarLyric;

let LyricIcon, ControlIcon, TrayIcon, CombineIcon;
let currrentLyric;
const setTray = remote.getGlobal('setTray');

function updateTray(show_lyric, show_control, show_tray) {
  const x_add = player.isPersonalFM ? 14 : 0;
  CombineIcon.ctx.clearRect(
    0,
    0,
    CombineIcon.canvas.width,
    CombineIcon.canvas.height
  );
  let x = 0;
  if (show_lyric) {
    CombineIcon.ctx.drawImage(LyricIcon.canvas, x, 0);
    x += LyricIcon.canvas.width + x_add;
  }
  if (show_control) {
    CombineIcon.ctx.drawImage(ControlIcon.canvas, x, 0);
    x += ControlIcon.canvas.width;
  }
  if (show_tray) {
    CombineIcon.ctx.drawImage(TrayIcon.canvas, x, 0);
  }
  setTray(
    CombineIcon.canvas.toDataURL(),
    CombineIcon.canvas.width / CombineIcon.devicePixelRatio,
    CombineIcon.canvas.height / CombineIcon.devicePixelRatio
  );
}

function getSeperateTray() {
  let lyric = new Lyric();
  let control = new Control([
    player.isPersonalFM ? thumbs_down : previous,
    player.playing ? paused : playing,
    next,
    player.isCurrentTrackLiked ? like_solid : liked,
  ]);
  let tray = new Control([tray_icon]);
  return [lyric, control, tray];
}

function getCombineTray(lyric_icon, control_icon, tray_icon) {
  const lyricWidth = lyricShow ? lyric_icon.canvas.width : 0;
  const contorlWidth = controlShow ? control_icon.canvas.width : 0;
  const trayWidth = trayShow ? tray_icon.canvas.width : 0;
  const width = lyricWidth + contorlWidth + trayWidth;
  const height = trayShow ? tray_icon.canvas.height : 0;
  const devicePixelRatio =
    lyric_icon?.devicePixelRatio || tray_icon?.devicePixelRatio || 1;
  const CombineIcon = new Canvas({ width, height });
  CombineIcon.devicePixelRatio = devicePixelRatio;
  return CombineIcon;
}

function changeStatus({
  changeLyric = false,
  changeControl = false,
  changeTray = false,
}) {
  if (changeTray) {
    TrayIcon.updateImage(tray_icon);
    TrayIcon.draw();
  }
  if (changeControl) {
    ControlIcon.updateImage(0, player.isPersonalFM ? thumbs_down : previous);
    ControlIcon.updateImage(1, player.playing ? paused : playing);
    ControlIcon.updateImage(3, player.isCurrentTrackLiked ? like_solid : liked);
    ControlIcon.draw();
  }
  if (changeLyric) {
    LyricIcon.draw();
  }
}

export default function initMacStatusbarLyric() {
  [LyricIcon, ControlIcon, TrayIcon] = getSeperateTray();
  CombineIcon = getCombineTray(LyricIcon, ControlIcon, TrayIcon);
  updateTray(lyricShow, controlShow, trayShow);
  changeStatus({ changeLyric: true, changeControl: true, changeTray: true });

  ipcRenderer.on('showTrayLyric', (event, arg) => {
    currrentLyric = arg;
    if (lyricShow) {
      LyricIcon.allLyric = currrentLyric;
      LyricIcon.findCurrentLyric();
    }
  });
  ipcRenderer.on('changeTrayPlayingStatus', () => {
    changeStatus({ changeControl: true });
  });
  ipcRenderer.on('changeTrayLikeStatus', () => {
    changeStatus({ changeControl: true });
  });
  ipcRenderer.on('trayClick', (event, { position }) => {
    const x_add = player.isPersonalFM ? 14 : 0;
    if (lyricShow && controlShow) {
      const x =
        position.x - LyricIcon.canvas.width / TrayIcon.devicePixelRatio - x_add;
      if (x > 0) {
        switch (parseInt(x / ControlIcon.singleWidth)) {
          case 0:
            if (player.isPersonalFM) {
              player.moveToFMTrash();
              changeStatus({
                changeLyric: false,
                changeControl: true,
                changeTray: false,
              });
            } else {
              player.playPrevTrack();
              changeStatus({
                changeLyric: false,
                changeControl: true,
                changeTray: false,
              });
            }
            break;
          case 1:
            player.playOrPause();
            changeStatus({
              changeLyric: false,
              changeControl: true,
              changeTray: false,
            });
            break;
          case 2:
            if (player.isPersonalFM) {
              player.playNextFMTrack();
            } else {
              player.playNextTrack();
            }
            break;
          case 3:
            store.dispatch('likeATrack', player.currentTrack.id);
            changeStatus({
              changeLyric: false,
              changeControl: true,
              changeTray: false,
            });
            break;
          case 4:
            ipcRenderer.send('windowShow');
            break;
        }
      }
    } else if (controlShow) {
      const x = position.x - x_add;
      switch (parseInt(x / ControlIcon.singleWidth)) {
        case 0:
          if (player.isPersonalFM) {
            player.moveToFMTrash();
            changeStatus({
              changeLyric: false,
              changeControl: true,
              changeTray: false,
            });
          } else {
            player.playPrevTrack();
            changeStatus({
              changeLyric: false,
              changeControl: true,
              changeTray: false,
            });
          }
          break;
        case 1:
          player.playOrPause();
          changeStatus({
            changeLyric: false,
            changeControl: true,
            changeTray: false,
          });
          break;
        case 2:
          if (player.isPersonalFM) {
            player.playNextFMTrack();
          } else {
            player.playNextTrack();
          }
          break;
        case 3:
          store.dispatch('likeATrack', player.currentTrack.id);
          changeStatus({
            changeLyric: false,
            changeControl: true,
            changeTray: false,
          });
          break;
        case 4:
          ipcRenderer.send('windowShow');
          break;
      }
    } else if (lyricShow) {
      const x = position.x - LyricIcon.canvas.width / TrayIcon.devicePixelRatio;
      if (x > 0) {
        ipcRenderer.send('windowShow');
      }
    }
  });
  ipcRenderer.on('switchLyricShow', () => {
    trayShow = store.state.settings.showTray;
    lyricShow = trayShow && store.state.settings.showStatusBarLyric;
    CombineIcon = getCombineTray(LyricIcon, ControlIcon, TrayIcon);
    LyricIcon.allLyric = lyricShow ? currrentLyric : null;
    updateTray(lyricShow, controlShow, trayShow);
    changeStatus({
      changeLyric: true,
      changeControl: false,
      changeTray: false,
    });
  });
  ipcRenderer.on('switchControlShow', () => {
    trayShow = store.state.settings.showTray;
    controlShow = trayShow && store.state.settings.showControl;
    CombineIcon = getCombineTray(LyricIcon, ControlIcon, TrayIcon);
    updateTray(lyricShow, controlShow, trayShow);
    changeStatus({
      changeLyric: false,
      changeControl: true,
      changeTray: false,
    });
  });
  ipcRenderer.on('switchTrayShow', () => {
    trayShow = store.state.settings.showTray;
    lyricShow = trayShow && store.state.settings.showStatusBarLyric;
    CombineIcon = getCombineTray(LyricIcon, ControlIcon, TrayIcon);
    LyricIcon.allLyric = lyricShow ? currrentLyric : null;
    updateTray(lyricShow, controlShow, trayShow);
    changeStatus({
      changeLyric: true,
      changeControl: true,
      changeTray: true,
    });
  });
  eventBus.$on('lyric-draw', () => {
    updateTray(lyricShow, controlShow, trayShow);
  });
  eventBus.$on('control-draw', () => {
    updateTray(lyricShow, controlShow, trayShow);
  });
}

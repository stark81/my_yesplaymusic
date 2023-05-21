import { ipcRenderer, remote } from 'electron';
import eventBus from '@/utils/eventBus';
import { Lyric, Control, Canvas } from '@/utils/trayCanvas';

import image_previous from './assets/skip_previous.png';
import image_previous_white from './assets/skip_previous_white.png';
import play from './assets/play_arrow.png';
import play_white from './assets/play_arrow_white.png';
import skip_next from './assets/skip_next.png';
import skip_next_white from './assets/skip_next_white.png';
import pause from './assets/pause.png';
import pause_white from './assets/pause_white.png';
import like from './assets/like.png';
import like_white from './assets/like_white.png';
import like_fill from './assets/like_fill.png';
import like_fill_white from './assets/like_fill_white.png';
import icon from './assets/icon.png';
import icon_white from './assets/icon_white.png';
import thumbs_down_icon from './assets/thumbs_down.png';
import thumbs_down_white_icon from './assets/thumbs_down_white.png';

import store from '@/store';
const player = store.state.player;

let trayShow = store.state.settings.showTray;
let controlShow = trayShow && store.state.settings.showControl;
let lyricShow = trayShow && store.state.settings.showStatusBarLyric;

let useDarkMode = false;
let previous, thumbs_down, playing, next, paused, liked, like_solid, tray_icon;
let LyricIcon, ControlIcon, TrayIcon, CombineIcon;
let currrentLyric;
const setTray = remote.getGlobal('setTray');

// 根据深浅色模式， 获取控制组件里每一个小图标
function getControlIcon(isDarkMode) {
  return isDarkMode
    ? [
        image_previous_white,
        thumbs_down_white_icon,
        play_white,
        skip_next_white,
        pause_white,
        like_white,
        like_fill_white,
      ]
    : [
        image_previous,
        thumbs_down_icon,
        play,
        skip_next,
        pause,
        like,
        like_fill,
      ];
}

// 根据深浅色模式，获取托盘小图标
function getTrayIcon(isDarkMode) {
  return isDarkMode ? icon_white : icon;
}

function getIcon(useDarkMode) {
  tray_icon = getTrayIcon(useDarkMode);
  return new Control([tray_icon]);
}
function getControl(useDarkMode) {
  [previous, thumbs_down, playing, next, paused, liked, like_solid] =
    getControlIcon(useDarkMode);
  return new Control([
    player.isPersonalFM ? thumbs_down : previous,
    player.playing ? paused : playing,
    next,
    player.isCurrentTrackLiked ? like_solid : liked,
  ]);
}
function getLyric(useDarkMode) {
  let lyric = new Lyric();
  lyric.ctx.fillStyle = useDarkMode ? '#FFFFFF' : '#000000';
  return lyric;
}

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

function getSeperateTray(useDarkMode) {
  return [getLyric(useDarkMode), getControl(useDarkMode), getIcon(useDarkMode)];
}

function getCombineTray(LyricIcon, ControlIcon, TrayIcon) {
  const lyricWidth = lyricShow ? LyricIcon.canvas.width : 0;
  const contorlWidth = controlShow ? ControlIcon.canvas.width : 0;
  const trayWidth = trayShow ? TrayIcon.canvas.width : 0;
  const width = lyricWidth + contorlWidth + trayWidth;
  const height = trayShow ? TrayIcon.canvas.height : 0;
  const devicePixelRatio =
    LyricIcon?.devicePixelRatio || TrayIcon?.devicePixelRatio || 1;
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
    LyricIcon.ctx.fillStyle = useDarkMode ? '#FFFFFF' : '#000000';
    LyricIcon.draw();
  }
}

export default async function initMacStatusbarLyric() {
  ipcRenderer.invoke('getNativeTheme').then(isDarkMode => {
    useDarkMode = isDarkMode;
    [LyricIcon, ControlIcon, TrayIcon] = getSeperateTray(useDarkMode);
    CombineIcon = getCombineTray(LyricIcon, ControlIcon, TrayIcon);
    updateTray(lyricShow, controlShow, trayShow);
    changeStatus({ changeLyric: true, changeControl: true, changeTray: true });
  });

  ipcRenderer.on('changeTheme', (event, isDarkMode) => {
    useDarkMode = isDarkMode;
    [, ControlIcon, TrayIcon] = getSeperateTray(useDarkMode);
    changeStatus({ changeLyric: true, changeControl: true, changeTray: true });
  });

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
    const x = position.x - LyricIcon?.canvas.width / TrayIcon.devicePixelRatio;
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

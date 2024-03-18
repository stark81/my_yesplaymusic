import { ipcRenderer, remote } from 'electron';
import eventBus from '@/utils/eventBus';
import { Lyric, Control, Canvas } from '@/utils/trayCanvas';

import previous from '@/assets/tray/skip_previous.png';
import playing from '@/assets/tray/play_arrow.png';
import next from '@/assets/tray/skip_next.png';
import paused from '@/assets/tray/pause.png';
import liked from '@/assets/tray/like.png';
import like_solid from '@/assets/tray/like_fill.png';
import tray_icon from '@/assets/tray/icon.png';
import thumbs_down from '@/assets/tray/thumbs_down.png';

import store from '@/store';
const player = store.state.player;
const setTray = remote.getGlobal('setTray');
const setBarLyric = remote.getGlobal('setBarLyric');

class TrayLiric {
  constructor() {
    this._icon = null;
    this._control = null;
    this._lyric = null;
    this._lyricText = null;
    this.init();
  }
  init() {
    this.getIcons();
    this.getConbineIcon();
    this.buildTray();
    this.drawTray(true, true, true);
    this.handleEvent();
  }
  getIcons() {
    this._lyric = new Lyric();
    this._control = new Control([
      player.isPersonalFM ? thumbs_down : previous,
      player.playing ? paused : playing,
      next,
      player.isCurrentTrackLiked ? like_solid : liked,
    ]);
    this._icon = new Control([tray_icon]);
  }
  getConbineIcon() {
    const show_control = store.state.settings.showControl;
    const show_lyric = store.state.settings.showStatusBarLyric;
    let width = this._icon.canvas.width;
    let height = this._icon.canvas.height;
    let devicePixelRatio = 1;
    width += show_lyric ? this._lyric.canvas.width : 0;
    width += show_control ? this._control.canvas.width : 0;
    devicePixelRatio = this._icon.devicePixelRatio;
    this._tray = new Canvas({ width, height });
    this._tray.devicePixelRatio = devicePixelRatio;
  }
  buildTray() {
    const show_control = store.state.settings.showControl;
    const show_lyric = store.state.settings.showStatusBarLyric;
    const width = this._tray.canvas.width;
    const height = this._tray.canvas.height;
    this._tray.ctx.clearRect(0, 0, width, height);
    let x = 0;
    if (show_lyric) {
      this._tray.ctx.drawImage(this._lyric.canvas, x, 0);
      x += this._lyric.canvas.width;
    }
    if (show_control) {
      this._tray.ctx.drawImage(this._control.canvas, x, 0);
      x += this._control.canvas.width;
    }
    this._tray.ctx.drawImage(this._icon.canvas, x, 0);
    setTray(
      this._tray.canvas.toDataURL(),
      this._tray.canvas.width / this._tray.devicePixelRatio,
      this._tray.canvas.height / this._tray.devicePixelRatio
    );
  }
  drawTray(changeLyric, changeControl, changeIcon) {
    if (changeLyric) this._lyric.draw();
    if (changeControl) this._control.draw();
    if (changeIcon) this._icon.draw();
  }
  _drawControl() {
    this._control.updateImage(0, player.isPersonalFM ? thumbs_down : previous);
    this._control.updateImage(1, player.playing ? paused : playing);
    this._control.updateImage(
      3,
      player.isCurrentTrackLiked ? like_solid : liked
    );
    this._control.draw();
  }
  _allClick(show_lyric, position) {
    // tray图标左右各有8个像素的空白，计算时需要先减去8个像素
    const x = show_lyric
      ? position.x - 8 - this._lyric.canvas.width / this._tray.devicePixelRatio
      : position.x - 8;
    if (x > 0) {
      switch (parseInt(x / this._control.singleWidth)) {
        case 0:
          if (player.isPersonalFM) {
            player.moveToFMTrash();
          } else {
            player.playPrevTrack();
          }
          break;
        case 1:
          player.playOrPause();
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
          break;
        case 4:
          ipcRenderer.send('windowShow');
      }
    }
  }
  handleEvent() {
    ipcRenderer.on('changeTrayPlayingStatus', () => this._drawControl());
    ipcRenderer.on('changeTrayLikeStatus', () => this._drawControl());
    ipcRenderer.on('tray-click', (_, { position }) => {
      const show_control = store.state.settings.showControl;
      const show_lyric = store.state.settings.showStatusBarLyric;
      if (show_control) {
        this._allClick(show_lyric, position);
      } else if (show_lyric) {
        const x =
          position.x -
          8 -
          this._lyric.canvas.width / this._tray.devicePixelRatio;
        if (x > 0) ipcRenderer.send('windowShow');
      } else {
        ipcRenderer.send('windowShow');
      }
    });
    ipcRenderer.on('switchShowTray', (_, ops) => {
      if (ops === 'switchLyric') {
        const show_lyric = store.state.settings.showStatusBarLyric;
        this.getConbineIcon();
        if (show_lyric) {
          this._lyric.allLyric = this._lyricText;
          this._lyric.findCurrentLyric();
        }
        this.buildTray();
        this.drawTray(true, false, false);
      } else if (ops === 'switchControl') {
        this.getConbineIcon();
        this.buildTray();
        this.drawTray(false, true, false);
      }
    });
    eventBus.$on('lyric-draw', () => {
      this.buildTray();
    });
    eventBus.$on('control-draw', () => {
      this.buildTray();
    });
  }
}

class TouchBarLyric {
  constructor() {
    this._lyric = new Lyric({ width: 252, fontSize: 12 });
    this._lyric.allLyric = {
      text: player.currentTrack.name || '听你想听的音乐',
      width: 0,
      time: 0, // 单句歌词的播放时间
    };
    this._touchBar = new Canvas({
      width: this._lyric.canvas.width,
      height: this._lyric.canvas.height,
      devicePixelRatio: 1,
    });
    this.buildTouchBar();
    this.handleEvent();
  }
  buildTouchBar() {
    const width = this._touchBar.canvas.width;
    const height = this._touchBar.canvas.height;
    this._touchBar.ctx.clearRect(0, 0, width, height);
    this._touchBar.ctx.drawImage(this._lyric.canvas, 0, 0);
    setBarLyric(
      this._touchBar.canvas.toDataURL(),
      this._touchBar.canvas.width,
      this._touchBar.canvas.height
    );
  }
  handleEvent() {
    eventBus.$on('lyric-draw', () => {
      this.buildTouchBar();
    });
  }
}

export function initMacStatusbarLyric() {
  const tray = new TrayLiric();
  const touchBar = new TouchBarLyric();
  ipcRenderer.on('lyricsReceived', (_, arg) => {
    touchBar._lyric.allLyric = arg;
    touchBar._lyric.findCurrentLyric();
    tray._lyricText = arg;
    if (store.state.settings.showStatusBarLyric) {
      tray._lyric.allLyric = arg;
      tray._lyric.findCurrentLyric();
    }
  });
}

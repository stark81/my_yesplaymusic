import shortcuts from '@/utils/shortcuts';
import cloneDeep from 'lodash/cloneDeep';

export default {
  updateLikedXXX(state, { name, data }) {
    state.liked[name] = data;
    if (name === 'songs') {
      state.player.sendSelfToIpcMain();
    }
  },
  updateOsdLyric(state) {
    state.osdlyrics.show = !state.osdlyrics.show;
  },
  addLocalMusicXXX(state, { name, data }) {
    // data 必须是Array类型
    state.localMusic[name].push(...data);
  },
  updateLocalMusic(state, data) {
    state.localMusic = cloneDeep(data);
  },
  updateLocalMusicXXX(state, { name, data }) {
    state.localMusic[name] = data;
  },
  updateLocalsXXX(state, { name, type, data }) {
    if (type === 'push') {
      state.locals[name].push(data);
    } else {
      state.locals[name] = data;
    }
  },
  setDelayTime(state, { filePath, delayTime }) {
    const track = state.localMusic.tracks.find(t => t.filePath === filePath);
    track.lyricDelay = delayTime;
  },
  clearLocalMusic(state) {
    const songs = state.localMusic.songs;
    const newSongs = songs.map(obj => ({ ...obj, show: false }));
    state.localMusic.songs = newSongs;
  },
  changeLang(state, lang) {
    state.settings.lang = lang;
  },
  changeMusicQuality(state, value) {
    state.settings.musicQuality = value;
  },
  changeLyricFontSize(state, value) {
    state.settings.lyricFontSize = value;
  },
  changeOutputDevice(state, deviceId) {
    state.settings.outputDevice = deviceId;
  },
  updateSettings(state, { key, value }) {
    state.settings[key] = value;
  },
  updateData(state, { key, value }) {
    state.data[key] = value;
  },
  togglePlaylistCategory(state, name) {
    const index = state.settings.enabledPlaylistCategories.findIndex(
      c => c === name
    );
    if (index !== -1) {
      state.settings.enabledPlaylistCategories =
        state.settings.enabledPlaylistCategories.filter(c => c !== name);
    } else {
      state.settings.enabledPlaylistCategories.push(name);
    }
  },
  updateToast(state, toast) {
    state.toast = toast;
  },
  updateModal(state, { modalName, key, value }) {
    state.modals[modalName][key] = value;
    if (key === 'show') {
      // 100ms的延迟是为等待右键菜单blur之后再disableScrolling
      value === true
        ? setTimeout(() => (state.enableScrolling = false), 100)
        : (state.enableScrolling = true);
    }
  },
  toggleLyrics(state) {
    state.showLyrics = !state.showLyrics;
  },
  toggleUpdateStatus(state) {
    state.updateFlag = !state.updateFlag;
  },
  updateDailyTracks(state, dailyTracks) {
    state.dailyTracks = dailyTracks;
  },
  updateLastfm(state, session) {
    state.lastfm = session;
  },
  updateShortcut(state, { id, type, shortcut }) {
    let newShortcut = state.settings.shortcuts.find(s => s.id === id);
    newShortcut[type] = shortcut;
    state.settings.shortcuts = state.settings.shortcuts.map(s => {
      if (s.id !== id) return s;
      return newShortcut;
    });
  },
  restoreDefaultShortcuts(state) {
    state.settings.shortcuts = cloneDeep(shortcuts);
  },
  enableScrolling(state, status = null) {
    state.enableScrolling = status ? status : !state.enableScrolling;
  },
  updateTitle(state, title) {
    state.title = title;
  },
};

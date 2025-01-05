import shortcuts from '@/utils/shortcuts';
import cloneDeep from 'lodash/cloneDeep';
import Vue from 'vue';
import _ from 'lodash';

const getPicUrl = (tracks, id) => {
  const track = tracks.find(item => item.id === id);
  return track.matched
    ? (track.al || track.album).picUrl
    : `atom://get-pic/${track.filePath}`;
};

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
  setDelayTime(state, { filePath, delayTime }) {
    const track = state.localMusic.tracks.find(t => t.filePath === filePath);
    track.lyricDelay = delayTime;
  },
  addALocalTrack(state, track) {
    state.localMusic.tracks.push(track);
  },
  deleteLocalMusic(state) {
    const localMusic = state.localMusic;
    localMusic.playlists = [];
    localMusic.tracks = [];
    localMusic.sortBy = 'default';
    const electron = window.require('electron');
    const ipcRenderer = electron.ipcRenderer;
    ipcRenderer.send('deleteLocalMusic', localMusic);
  },
  addLocalPlaylist(state, playlistParams) {
    const playlist = {
      id: state.localMusic.playlists.length + 1,
      ...playlistParams,
    };
    state.localMusic.playlists.push(playlist);
  },
  updateLocalPlaylist(state, playlist) {
    const idx = state.localMusic.playlists.findIndex(p => p.id === playlist.id);
    if (idx !== -1) {
      Vue.set(state.localMusic.playlists, idx, playlist);
    }
  },
  updatePlaylistTracks(state, { oldTrack, newTrack }) {
    const tracks = state.localMusic.tracks;
    state.localMusic.playlists.forEach(p => {
      if (p.trackIds.includes(oldTrack.id)) {
        p.trackIds.splice(p.trackIds.indexOf(oldTrack.id), 1, newTrack.id);
        p.coverImgUrl = getPicUrl(tracks, p.trackIds[p.trackIds.length - 1]);
        p.updateTime = Date.now();
      }
    });
  },
  updateLocalTrackDetail(state, { oldTrack, newTrack }) {
    _.merge(oldTrack, newTrack);
    oldTrack.matched = true;
    oldTrack.isLocal = true;
    oldTrack.al.matched = true;
    oldTrack.ar.forEach(a => (a.matched = true));
  },
  updateOffset(state, offset) {
    const playerTrack = state.player.currentTrack;
    if (playerTrack) {
      playerTrack.offset = offset;
      const localTrack = state.localMusic.tracks.find(
        t => t.id === playerTrack.id
      );
      if (localTrack) {
        localTrack.offset = offset;
      }
    }
  },
  deleteLocalPlaylist(state, id) {
    const idx = state.localMusic.playlists.findIndex(p => p.id === id);
    if (idx !== -1) {
      state.localMusic.playlists.splice(idx, 1);
    }
  },
  updateSortBy(state, value) {
    state.localMusic.sortBy = value;
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
  updateDBusStatus(state, status) {
    state.extensionStatus = status;
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
  setVirtualScroll(state, status = null) {
    state.enabledVirtualScroll =
      status !== null ? status : !state.enabledVirtualScroll;
  },
  enableScrolling(state, status = null) {
    state.enableScrolling = status !== null ? status : !state.enableScrolling;
  },
  updateTitle(state, title) {
    state.title = title;
  },
  updateModalStatus(state, status) {
    state.modalOpen = status;
  },
};

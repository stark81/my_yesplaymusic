import shortcuts from '@/utils/shortcuts';
import cloneDeep from 'lodash/cloneDeep';

export default {
  updateLikedXXX(state, { name, data }) {
    state.liked[name] = data;
    if (name === 'songs') {
      console.log('mutations.js updateLikedXXX');
      state.player.sendSelfToIpcMain();
    }
  },
  clearLocalMusic(state) {
    const songs = state.localMusic.songs;
    const newSongs = songs.map(obj => ({ ...obj, show: false }));
    state.localMusic.songs = newSongs;

    const albums = state.localMusic.albums;
    const newAlbums = albums.map(obj => ({ ...obj, show: false }));
    state.localMusic.albums = newAlbums;

    const artists = state.localMusic.artists;
    const newArtists = artists.map(obj => ({ ...obj, show: false }));
    state.localMusic.artists = newArtists;
  },
  addAnAlbum(state, value) {
    state.localMusic.albums.push(value);
  },
  addAnArtist(state, value) {
    state.localMusic.artists.push(value);
  },
  updateArtist(state, value) {
    const index = state.localMusic.artists.findIndex(
      obj => obj.id === value.id
    );
    if (index !== -1) {
      state.localMusic.artists.splice(index, 1, value);
    }
  },
  updateAlbum(state, value) {
    const index = state.localMusic.albums.findIndex(obj => obj.id === value.ID);
    if (index !== -1) {
      state.localMusic.albums.splice(index, 1, value.value);
    }
  },
  updateAsong(state, value) {
    const index = state.localMusic.songs.findIndex(obj => obj.id === value.id);
    if (index !== -1) {
      state.localMusic.songs.splice(index, 1, value);
    }
  },
  changeFilter(state, value) {
    state.localMusic.sortBy = value;
  },
  addAMusic(state, value) {
    state.localMusic.songs.push(value);
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

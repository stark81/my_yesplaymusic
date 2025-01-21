import store from '@/store';

const player = store.state.player;
const settings = store.state.settings;
let localMusic = store.state.localMusic;

export function ipcRenderer(vueInstance) {
  const self = vueInstance;
  // 添加专有的类名
  document.body.setAttribute('data-electron', 'yes');
  document.body.setAttribute(
    'data-electron-os',
    window.require('os').platform()
  );
  // ipc message channel
  const electron = window.require('electron');
  const ipcRenderer = electron.ipcRenderer;

  // listens to the main process 'changeRouteTo' event and changes the route from
  // inside this Vue instance, according to what path the main process requires.
  // responds to Menu click() events at the main process and changes the route accordingly.

  if (settings.localMusicFolderPath) {
    ipcRenderer.send('currentLocalMusic', localMusic?.tracks || []);
    ipcRenderer.send('msgScanLocalMusic', settings.localMusicFolderPath);
  }
  ipcRenderer.on('deleteLocalMusic', (event, data) => {
    localMusic = data;
  });
  ipcRenderer.on('msgHandleScanLocalMusic', (event, data) => {
    store.commit('addALocalTrack', data.song);
  });
  // ipcRenderer.on('scanLocalMusicDone', () => {
  //   console.log('scanLocalMusicDone', localMusic);
  //   // localStorage.setItem('localMusic', JSON.stringify(localMusic));
  // });

  ipcRenderer.on('changeRouteTo', (event, path) => {
    self.$router.push(path);
    if (store.state.showLyrics) {
      store.commit('toggleLyrics');
    }
  });

  ipcRenderer.on('search', () => {
    // 触发数据响应
    self.$refs.navbar.$refs.searchInput.focus();
    self.$refs.navbar.inputFocus = true;
  });

  ipcRenderer.on('play', () => {
    if (
      document.activeElement.tagName === 'INPUT' ||
      document.activeElement.classList.contains('comment_box')
    ) {
      // 防止输入框聚焦时播放
      return;
    }
    player.playOrPause();
  });

  ipcRenderer.on('next', () => {
    if (player.isPersonalFM) {
      player.playNextFMTrack();
    } else {
      player.playNextTrack();
    }
  });

  ipcRenderer.on('previous', () => {
    player.playPrevTrack();
  });

  ipcRenderer.on('increaseVolume', () => {
    if (player.volume + 0.1 >= 1) {
      return (player.volume = 1);
    }
    player.volume += 0.1;
  });

  ipcRenderer.on('decreaseVolume', () => {
    if (player.volume - 0.1 <= 0) {
      return (player.volume = 0);
    }
    player.volume -= 0.1;
  });

  ipcRenderer.on('like', () => {
    if (player.currentTrack.isLocal && !player.currentTrack.matched) return;
    store.dispatch('likeATrack', player.currentTrack.id);
  });

  ipcRenderer.on('repeat', (event, mode) => {
    // player.switchRepeatMode();
    player.repeatMode = mode;
  });

  ipcRenderer.on('repeat-shuffle', (event, isShuffle) => {
    player.shuffle = isShuffle;
  });

  ipcRenderer.on('fm-trash', () => {
    player.moveToFMTrash();
  });

  ipcRenderer.on('shuffle', () => {
    player.switchShuffle();
  });

  ipcRenderer.on('routerGo', (event, where) => {
    self.$refs.navbar.go(where);
  });

  ipcRenderer.on('nextUp', () => {
    self.$refs.player.goToNextTracksPage();
  });

  ipcRenderer.on('rememberCloseAppOption', (event, value) => {
    store.commit('updateSettings', {
      key: 'closeAppOption',
      value,
    });
  });

  ipcRenderer.on('updateOSDShow', () => {
    store.commit('updateSettings', {
      key: 'showOsdLyric',
      value: !store.state.settings.showOsdLyric,
    });
  });

  ipcRenderer.on('setPosition', (event, position) => {
    player._howler.seek(position);
  });

  ipcRenderer.on('dbus-status', (event, status) => {
    store.commit('updateDBusStatus', status);
  });
}

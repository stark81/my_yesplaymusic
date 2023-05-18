import { playlistCategories } from '@/utils/staticData';
import shortcuts from '@/utils/shortcuts';

console.debug('[debug][initLocalStorage.js]');
const enabledPlaylistCategories = playlistCategories
  .filter(c => c.enable)
  .map(c => c.name);

let localStorage = {
  player: {},
  settings: {
    lang: null,
    musicLanguage: 'all',
    appearance: 'auto',
    musicQuality: 320000,
    lyricFontSize: 28,
    outputDevice: 'default',
    showPlaylistsByAppleMusic: true,
    enableUnblockNeteaseMusic: true,
    automaticallyCacheSongs: true,
    cacheLimit: 8192,
    enableReversedMode: false,
    nyancatStyle: false,
    showLyricsTranslation: true,
    showTray: true,
    showControl: true,
    showStatusBarLyric: true,
    localMusicFolderPath: null,
    lyricsBackground: true,
    closeAppOption: 'ask',
    enableDiscordRichPresence: false,
    enableGlobalShortcut: true,
    showLibraryDefault: false,
    subTitleDefault: false,
    linuxEnableCustomTitlebar: false,
    enabledPlaylistCategories,
    proxyConfig: {
      protocol: 'noProxy',
      server: '',
      port: null,
    },
    shortcuts: shortcuts,
  },
  data: {
    user: {},
    likedSongPlaylistID: 0,
    lastRefreshCookieDate: 0,
    loginMode: null,
  },
  localMusic: {
    trackIdCounter: 1,
    albumsIdCounter: 1,
    artistsIdCounter: 1,
    playlistIdCounter: 1,
    songs: [],
    latestAddTracks: [], // 只有前12首
    playlists: [],
    tracks: [],
    albums: [],
    artists: [],
    sortBy: null,
  },
};

if (process.env.IS_ELECTRON === true) {
  localStorage.settings.automaticallyCacheSongs = true;
}

export default localStorage;

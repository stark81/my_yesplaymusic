import initLocalStorage from './initLocalStorage';
import pkg from '../../package.json';
import updateApp from '@/utils/updateApp';

if (localStorage.getItem('appVersion') === null) {
  localStorage.setItem('settings', JSON.stringify(initLocalStorage.settings));
  localStorage.setItem('data', JSON.stringify(initLocalStorage.data));
  localStorage.setItem(
    'localMusic',
    JSON.stringify(initLocalStorage.localMusic)
  );
  localStorage.setItem('appVersion', pkg.version);
}

updateApp();

export default {
  showLyrics: false,
  updateFlag: true,
  enableScrolling: true,
  enabledVirtualScroll: false,
  title: 'YesPlayMusic',
  liked: {
    songs: [],
    songsWithDetails: [], // 只有前12首
    playlists: [],
    albums: [],
    artists: [],
    mvs: [],
    cloudDisk: [],
    playHistory: {
      weekData: [],
      allData: [],
    },
  },
  contextMenu: {
    clickObjectID: 0,
    showMenu: false,
  },
  toast: {
    show: false,
    text: '',
    timer: null,
  },
  modals: {
    addTrackToPlaylistModal: {
      show: false,
      selectedTrackID: 0,
      isLocal: false,
    },
    newPlaylistModal: {
      show: false,
      afterCreateAddTrackID: 0,
      isLocal: false,
    },
    deleteCommentModal: {
      show: false,
      isFloorComment: false,
      comment: {},
      finish: false,
    },
    setLyricDelayModal: {
      show: false,
      delayTime: null,
    },
    setPlayBackRate: {
      show: false,
    },
    accurateMatchModal: {
      show: false,
      selectedTrackID: 0,
    },
  },
  dailyTracks: [],
  lastfm: JSON.parse(localStorage.getItem('lastfm')) || {},
  player: JSON.parse(localStorage.getItem('player')),
  settings: JSON.parse(localStorage.getItem('settings')),
  data: JSON.parse(localStorage.getItem('data')),
  localMusic: JSON.parse(localStorage.getItem('localMusic')),
};

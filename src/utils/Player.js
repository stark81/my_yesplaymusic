import { getAlbum } from '@/api/album';
import { getArtist } from '@/api/artist';
import { trackScrobble, trackUpdateNowPlaying } from '@/api/lastfm';
import { fmTrash, personalFM } from '@/api/others';
import { getPlaylistDetail, intelligencePlaylist } from '@/api/playlist';
import { getMP3, getTrackDetail, getLyric } from '@/api/track';
import store from '@/store';
import { isAccountLoggedIn } from '@/utils/auth';
import { lyricParser } from '@/utils/lyrics';
import { cacheTrackSource, getTrackSource } from '@/utils/db';
import { isCreateMpris, isCreateTray, isMac } from '@/utils/platform';
import { Howl, Howler } from 'howler';
import shuffle from 'lodash/shuffle';
import { decode as base642Buffer } from '@/utils/base64';

const PLAY_PAUSE_FADE_DURATION = 200;

/**
 * @readonly
 * @enum {string}
 */
const UNPLAYABLE_CONDITION = {
  PLAY_NEXT_TRACK: 'playNextTrack',
  PLAY_PREV_TRACK: 'playPrevTrack',
};

const electron =
  process.env.IS_ELECTRON === true ? window.require('electron') : null;
const ipcRenderer =
  process.env.IS_ELECTRON === true ? electron.ipcRenderer : null;
const delay = ms =>
  new Promise(resolve => {
    setTimeout(() => {
      resolve('');
    }, ms);
  });
const excludeSaveKeys = [
  // '_playing',
  '_personalFMLoading',
  '_personalFMNextLoading',
];

function setTitle(track) {
  document.title = track
    ? `${track.name} · ${track.ar[0].name} - YesPlayMusic`
    : 'YesPlayMusic';
  if (!isMac) {
    ipcRenderer?.send('updateTrayTooltip', document.title);
  }
  store.commit('updateTitle', document.title);
}

function setTrayLikeState(isLiked) {
  if (isCreateTray) {
    ipcRenderer?.send('updateTrayLikeState', isLiked);
  }
}

export default class {
  constructor() {
    // 播放器状态
    this._playing = false; // 是否正在播放中
    this._progress = 0; // 当前播放歌曲的进度
    this._enabled = false; // 是否启用Player
    this._repeatMode = 'off'; // off | on | one
    this._shuffle = false; // true | false
    this._reversed = false;
    this._volume = 1; // 0 to 1
    this._volumeBeforeMuted = 1; // 用于保存静音前的音量
    this._personalFMLoading = false; // 是否正在私人FM中加载新的track
    this._personalFMNextLoading = false; // 是否正在缓存私人FM的下一首歌曲

    // 播放信息
    this._list = []; // 播放列表
    this._isLocal = false;
    this._localPic = null;
    this._localID = null;
    this._current = 0; // 当前播放歌曲在播放列表里的index
    this._shuffledList = []; // 被随机打乱的播放列表，随机播放模式下会使用此播放列表
    this._shuffledCurrent = 0; // 当前播放歌曲在随机列表里面的index
    this._playlistSource = { type: 'album', id: 123 }; // 当前播放列表的信息
    this._currentTrack = { id: 86827685 }; // 当前播放歌曲的详细信息
    this._playNextList = []; // 当这个list不为空时，会优先播放这个list的歌
    this._isPersonalFM = false; // 是否是私人FM模式
    this._personalFMTrack = { id: 0 }; // 私人FM当前歌曲
    this._lyrics = { lyric: [], tlyric: [], rlyric: [] };
    this._currentLyricIndex = -1;
    this._personalFMNextTrack = {
      id: 0,
    }; // 私人FM下一首歌曲信息（为了快速加载下一首）

    /**
     * The blob records for cleanup.
     *
     * @private
     * @type {string[]}
     */
    this.createdBlobRecords = [];

    // howler (https://github.com/goldfire/howler.js)
    this._howler = null;
    Object.defineProperty(this, '_howler', {
      enumerable: false,
    });

    // init
    this._init();

    window.yesplaymusic = {};
    window.yesplaymusic.player = this;
  }

  get repeatMode() {
    return this._repeatMode;
  }
  set repeatMode(mode) {
    if (this._isPersonalFM) return;
    if (!['off', 'on', 'one'].includes(mode)) {
      console.warn("repeatMode: invalid args, must be 'on' | 'off' | 'one'");
      return;
    }
    this._repeatMode = mode;
  }
  get shuffle() {
    return this._shuffle;
  }
  set shuffle(shuffle) {
    if (this._isPersonalFM) return;
    if (shuffle !== true && shuffle !== false) {
      console.warn('shuffle: invalid args, must be Boolean');
      return;
    }
    this._shuffle = shuffle;
    if (shuffle) {
      this._shuffleTheList();
    }
  }
  get reversed() {
    return this._reversed;
  }
  set reversed(reversed) {
    if (this._isPersonalFM) return;
    if (reversed !== true && reversed !== false) {
      console.warn('reversed: invalid args, must be Boolean');
      return;
    }
    console.log('changing reversed to:', reversed);
    this._reversed = reversed;
  }
  get volume() {
    return this._volume;
  }
  set volume(volume) {
    this._volume = volume;
    this._howler?.volume(volume);
  }
  get list() {
    return this.shuffle ? this._shuffledList : this._list;
  }
  set list(list) {
    this._list = list;
  }
  get current() {
    return this.shuffle ? this._shuffledCurrent : this._current;
  }
  set current(current) {
    if (this.shuffle) {
      this._shuffledCurrent = current;
    } else {
      this._current = current;
    }
  }
  get enabled() {
    return this._enabled;
  }
  get playing() {
    return this._playing;
  }
  get currentTrack() {
    return this._currentTrack;
  }
  get currentTrackID() {
    return this._currentTrack?.id ?? 0;
  }
  get playlistSource() {
    return this._playlistSource;
  }
  get playNextList() {
    return this._playNextList;
  }
  get isLocal() {
    return this._isLocal;
  }
  get isPersonalFM() {
    return this._isPersonalFM;
  }
  get personalFMTrack() {
    return this._personalFMTrack;
  }
  get currentTrackDuration() {
    const trackDuration = this._currentTrack.dt || 1000;
    let duration = ~~(trackDuration / 1000);
    return duration > 1 ? duration - 1 : duration;
  }
  get progress() {
    return this._progress;
  }
  set progress(value) {
    if (this._howler) {
      this._howler.seek(value);
    }
  }
  get isCurrentTrackLiked() {
    return store.state.liked.songs.includes(this.currentTrack.id);
  }

  get currentLyricIndex() {
    return this._currentLyricIndex;
  }

  get lyrics() {
    return this._lyrics;
  }

  _init() {
    this._loadSelfFromLocalStorage();
    this._howler?.volume(this.volume);

    if (this._enabled) {
      // 恢复当前播放歌曲
      this._replaceCurrentTrack(this.currentTrackID, false).then(() => {
        this._howler?.seek(localStorage.getItem('playerCurrentTrackTime') ?? 0);
      }); // update audio source and init howler
      this._initMediaSession();
    }

    this._setIntervals();

    // 初始化私人FM
    if (
      this._personalFMTrack.id === 0 ||
      this._personalFMNextTrack.id === 0 ||
      this._personalFMTrack.id === this._personalFMNextTrack.id
    ) {
      personalFM().then(result => {
        this._personalFMTrack = result.data[0];
        this._personalFMNextTrack = result.data[1];
        return this._personalFMTrack;
      });
    }
  }
  _setPlaying(isPlaying) {
    this._playing = isPlaying;
    ipcRenderer?.send('updateTrayPlayState', this._playing);
  }
  _setIntervals() {
    // 同步播放进度
    // TODO: 如果 _progress 在别的地方被改变了，
    // 这个定时器会覆盖之前改变的值，是bug
    setInterval(() => {
      if (this._howler === null) return;
      this._progress = this._howler.seek();
      localStorage.setItem('playerCurrentTrackTime', this._progress);
      if (isCreateMpris) {
        ipcRenderer?.send('playerCurrentTrackTime', this._progress);
      }
    }, 1000);

    // 同步歌词进度
    setInterval(() => {
      const offset = this._currentTrack?.lyricDelay ?? 0;
      const progress = this._howler.seek() + offset;
      this._currentLyricIndex = this._lyrics.lyric.findIndex((l, index) => {
        const nextLyric = this._lyrics.lyric[index + 1];
        const nextLrcTime = nextLyric
          ? nextLyric.time
          : this.currentTrackDuration;
        return progress >= l.time && progress < nextLrcTime;
      });
    }, 50);
  }
  _getNextTrack() {
    const next = this._reversed ? this.current - 1 : this.current + 1;

    if (this._playNextList.length > 0) {
      let trackID = this._playNextList.shift();
      return [trackID, this.current];
    }

    // 循环模式开启，则重新播放当前模式下的相对的下一首
    if (this.repeatMode === 'on') {
      if (this._reversed && this.current === 0) {
        // 倒序模式，当前歌曲是第一首，则重新播放列表最后一首
        return [this.list[this.list.length - 1], this.list.length - 1];
      } else if (this.list.length === this.current + 1) {
        // 正序模式，当前歌曲是最后一首，则重新播放第一首
        return [this.list[0], 0];
      }
    }

    // 返回 [trackID, index]
    return [this.list[next], next];
  }
  _getPrevTrack() {
    const next = this._reversed ? this.current + 1 : this.current - 1;

    // 循环模式开启，则重新播放当前模式下的相对的下一首
    if (this.repeatMode === 'on') {
      if (this._reversed && this.current === 0) {
        // 倒序模式，当前歌曲是最后一首，则重新播放列表第一首
        return [this.list[0], 0];
      } else if (this.list.length === this.current + 1) {
        // 正序模式，当前歌曲是第一首，则重新播放列表最后一首
        return [this.list[this.list.length - 1], this.list.length - 1];
      }
    }

    // 返回 [trackID, index]
    return [this.list[next], next];
  }
  async _shuffleTheList(firstTrackID = this.currentTrackID) {
    let list = this._list.filter(tid => tid !== firstTrackID);
    if (firstTrackID === 'first') list = this._list;
    this._shuffledList = shuffle(list);
    if (firstTrackID !== 'first') this._shuffledList.unshift(firstTrackID);
  }
  async _scrobble(track, time, completed = false) {
    console.debug(
      `[debug][Player.js] scrobble track 👉 ${track.name} by ${track.ar[0].name} 👉 time:${time} completed: ${completed}`
    );
    const trackDuration = ~~(track.dt / 1000);
    time = completed ? trackDuration : ~~time;
    // scrobble({
    //   id: track.id,
    //   sourceid: this.playlistSource.id,
    //   time,
    // });
    if (
      store.state.lastfm.key !== undefined &&
      (time >= trackDuration / 2 || time >= 240)
    ) {
      const timestamp = ~~(new Date().getTime() / 1000) - time;
      trackScrobble({
        artist: track.ar[0].name,
        track: track.name,
        timestamp,
        album: track.al.name,
        trackNumber: track.no || 1,
        duration: trackDuration,
      });
    }
  }
  _playAudioSource(source, autoplay = true) {
    Howler.unload();
    this._howler = new Howl({
      src: [source],
      html5: true,
      preload: true,
      format: ['mp3', 'flac', 'alac', 'm4a', 'aac', 'wav'],
      onend: () => {
        this._nextTrackCallback();
      },
    });
    this._howler.on('loaderror', (_, errCode) => {
      // https://developer.mozilla.org/en-US/docs/Web/API/MediaError/code
      // code 3: MEDIA_ERR_DECODE
      if (errCode === 3) {
        this._playNextTrack(this._isPersonalFM);
      } else {
        const t = this.progress;
        this._replaceCurrentTrackAudio(this.currentTrack, false, false).then(
          replaced => {
            // 如果 replaced 为 false，代表当前的 track 已经不是这里想要替换的track
            // 此时则不修改当前的歌曲进度
            if (replaced) {
              this._howler?.seek(t);
              this.play();
            }
          }
        );
      }
    });
    if (autoplay) {
      this.play();
      if (this._currentTrack.name) {
        setTitle(this._currentTrack);
      }
      setTrayLikeState(store.state.liked.songs.includes(this.currentTrack.id));
    }
    this.setOutputDevice();
  }
  _getAudioSourceBlobURL(data) {
    // Create a new object URL.
    const source = URL.createObjectURL(new Blob([data]));

    // Clean up the previous object URLs since we've created a new one.
    // Revoke object URLs can release the memory taken by a Blob,
    // which occupied a large proportion of memory.
    for (const url in this.createdBlobRecords) {
      URL.revokeObjectURL(url);
    }

    // Then, we replace the createBlobRecords with new one with
    // our newly created object URL.
    this.createdBlobRecords = [source];

    return source;
  }
  _getAudioSourceFromCache(id) {
    return getTrackSource(id).then(t => {
      if (!t) return null;
      return this._getAudioSourceBlobURL(t.source);
    });
  }
  _getAudioSourceFromNetease(track) {
    if (isAccountLoggedIn()) {
      return getMP3(track.id).then(result => {
        if (!result.data[0]) return null;
        if (!result.data[0].url) return null;
        if (result.data[0].freeTrialInfo !== null) return null; // 跳过只能试听的歌曲
        const source = result.data[0].url.replace(/^http:/, 'https:');
        if (store.state.settings.automaticallyCacheSongs) {
          cacheTrackSource(track, source, result.data[0].br);
        }
        return source;
      });
    } else {
      return new Promise(resolve => {
        resolve(`https://music.163.com/song/media/outer/url?id=${track.id}`);
      });
    }
  }
  async _getAudioSourceFromUnblockMusic(track) {
    console.debug(`[debug][Player.js] _getAudioSourceFromUnblockMusic`);

    if (
      process.env.IS_ELECTRON !== true ||
      store.state.settings.enableUnblockNeteaseMusic === false
    ) {
      return null;
    }

    /**
     *
     * @param {string=} searchMode
     * @returns {import("@unblockneteasemusic/rust-napi").SearchMode}
     */
    const determineSearchMode = searchMode => {
      /**
       * FastFirst = 0
       * OrderFirst = 1
       */
      switch (searchMode) {
        case 'fast-first':
          return 0;
        case 'order-first':
          return 1;
        default:
          return 0;
      }
    };

    const retrieveSongInfo = await ipcRenderer.invoke(
      'unblock-music',
      store.state.settings.unmSource,
      track,
      {
        enableFlac: store.state.settings.unmEnableFlac || null,
        proxyUri: store.state.settings.unmProxyUri || null,
        searchMode: determineSearchMode(store.state.settings.unmSearchMode),
        config: {
          'joox:cookie': store.state.settings.unmJooxCookie || null,
          'qq:cookie': store.state.settings.unmQQCookie || null,
          'ytdl:exe': store.state.settings.unmYtDlExe || null,
        },
      }
    );

    if (store.state.settings.automaticallyCacheSongs && retrieveSongInfo?.url) {
      // 对于来自 bilibili 的音源
      // retrieveSongInfo.url 是音频数据的base64编码
      // 其他音源为实际url
      const url =
        retrieveSongInfo.source === 'bilibili'
          ? `data:application/octet-stream;base64,${retrieveSongInfo.url}`
          : retrieveSongInfo.url;
      cacheTrackSource(track, url, 128000, `unm:${retrieveSongInfo.source}`);
    }

    if (!retrieveSongInfo) {
      return null;
    }

    if (retrieveSongInfo.source !== 'bilibili') {
      return retrieveSongInfo.url;
    }

    const buffer = base642Buffer(retrieveSongInfo.url);
    return this._getAudioSourceBlobURL(buffer);
  }
  _getAudioSource(track) {
    if (track.isLocal === true) {
      const getLocalMusic = track => {
        return new Promise(resolve => {
          const source = `file://${track.filePath}`;
          resolve(source);
        });
      };
      return getLocalMusic(track).then(source => {
        return source;
      });
    } else {
      return this._getAudioSourceFromCache(String(track.id))
        .then(source => {
          return source ?? this._getAudioSourceFromNetease(track);
        })
        .then(source => {
          return source ?? this._getAudioSourceFromUnblockMusic(track);
        });
    }
  }
  _replaceCurrentTrack(
    id,
    autoplay = true,
    ifUnplayableThen = UNPLAYABLE_CONDITION.PLAY_NEXT_TRACK
  ) {
    if (
      autoplay &&
      this._currentTrack.name &&
      this._currentTrack.matched !== false
    ) {
      this._scrobble(this.currentTrack, this._howler?.seek());
    }
    const getLocalMusic = id => {
      return new Promise(resolve => {
        const localMusic = store
          ? store.state.localMusic
          : JSON.parse(localStorage.getItem('localMusic'));
        const settings = store
          ? store.state.settings
          : JSON.parse(localStorage.getItem('settings'));
        const matchTrack = localMusic.tracks?.find(track => track.id === id);
        if (matchTrack && settings.localMusicFirst) {
          resolve({ songs: [matchTrack] });
          if (this.isLocal !== true) {
            store?.dispatch(
              'showToast',
              `使用本地文件播放歌曲：${matchTrack.name}`
            );
          }
        }
        resolve({ songs: [] });
      });
    };
    return getLocalMusic(id)
      .then(data => {
        this._localID = id;
        return data.songs[0] ? data : getTrackDetail(id);
      })
      .then(data => {
        const track = data.songs[0];
        this._udpateTrackInfo(track);
        return this._replaceCurrentTrackAudio(
          track,
          autoplay,
          false,
          ifUnplayableThen
        );
      });
  }

  // 切换歌曲后的所有更新操作，包括：替换歌曲、获取歌词、更新歌词idx等；
  _udpateTrackInfo(track) {
    this._currentTrack = track;
    this._currentLyricIndex = -1;
    this._getLyric(track).then(() => {
      this.saveSelfToLocalStorage();
    });
    this._updateMediaSessionMetaData(track);
  }

  async _getLyric(track) {
    const fnPools = [];
    if (track.matched !== false) {
      fnPools.push([getLyric, track.id]);
    }
    if (track.isLocal) {
      fnPools.push([this._getInnerLyric, track.filePath]);
    }

    let [getLyricFn, param] = fnPools.shift();
    let data = await getLyricFn(param);

    if (!data?.lrc?.lyric && fnPools.length > 0) {
      [getLyricFn, param] = fnPools.shift();
      data = await getLyricFn(param);
    }

    if (!data?.lrc?.lyric) {
      this._lyrics.lyric = [];
      this._lyrics.tlyric = [];
      this._lyrics.rlyric = [];
      return;
    } else {
      let { lyric, tlyric, rlyric } = lyricParser(data);
      lyric = lyric.filter(l => !/^作(词|曲)\s*(:|：)\s*无$/.exec(l.content));
      let includeAM =
        lyric.length <= 10 &&
        lyric.map(l => l.content).includes('纯音乐，请欣赏');
      if (includeAM) {
        let reg = /^作(词|曲)\s*(:|：)\s*/;
        let author = track?.ar[0]?.name;
        lyric = lyric.filter(l => {
          let regExpArr = l.content.match(reg);
          return !regExpArr || l.content.replace(regExpArr[0], '') !== author;
        });
      }
      if (lyric.length === 1 && includeAM) {
        this._lyrics.lyric = [];
        this._lyrics.tlyric = [];
        this._lyrics.rlyric = [];
        return false;
      } else {
        this._lyrics.lyric = lyric;
        this._lyrics.tlyric = tlyric;
        this._lyrics.rlyric = rlyric;
        return true;
      }
    }
  }

  async _getInnerLyric(filePath) {
    const data = await fetch(`atom://get-lyric/${filePath}`).then(res =>
      res.json()
    );
    return data;
  }

  /**
   * @returns 是否成功加载音频，并使用加载完成的音频替换了howler实例
   */
  _replaceCurrentTrackAudio(
    track,
    autoplay,
    isCacheNextTrack,
    ifUnplayableThen = UNPLAYABLE_CONDITION.PLAY_NEXT_TRACK
  ) {
    return this._getAudioSource(track).then(source => {
      if (source) {
        let replaced = false;
        if (track.id === this.currentTrackID) {
          this._playAudioSource(source, autoplay);
          replaced = true;
        }
        if (isCacheNextTrack) {
          this._cacheNextTrack();
        }
        return replaced;
      } else {
        store.dispatch('showToast', `无法播放 ${track.name}`);
        switch (ifUnplayableThen) {
          case UNPLAYABLE_CONDITION.PLAY_NEXT_TRACK:
            this._playNextTrack(this.isPersonalFM);
            break;
          case UNPLAYABLE_CONDITION.PLAY_PREV_TRACK:
            this.playPrevTrack();
            break;
          default:
            store.dispatch(
              'showToast',
              `undefined Unplayable condition: ${ifUnplayableThen}`
            );
            break;
        }
        return false;
      }
    });
  }
  _cacheNextTrack() {
    let nextTrackID = this._isPersonalFM
      ? this._personalFMNextTrack?.id ?? 0
      : this._getNextTrack()[0];
    if (!nextTrackID) return;
    if (this._personalFMTrack.id == nextTrackID) return;
    getTrackDetail(nextTrackID).then(data => {
      let track = data.songs[0];
      this._getAudioSource(track);
    });
  }
  _loadSelfFromLocalStorage() {
    const player = JSON.parse(localStorage.getItem('player'));
    if (!player) return;
    for (const [key, value] of Object.entries(player)) {
      this[key] = value;
    }
  }
  _initMediaSession() {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => {
        this.play();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        this.pause();
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        this.playPrevTrack();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        this._playNextTrack(this.isPersonalFM);
      });
      navigator.mediaSession.setActionHandler('stop', () => {
        this.pause();
      });
      navigator.mediaSession.setActionHandler('seekto', event => {
        this.seek(event.seekTime);
        this._updateMediaSessionPositionState();
      });
      navigator.mediaSession.setActionHandler('seekbackward', event => {
        this.seek(this.seek() - (event.seekOffset || 10));
        this._updateMediaSessionPositionState();
      });
      navigator.mediaSession.setActionHandler('seekforward', event => {
        this.seek(this.seek() + (event.seekOffset || 10));
        this._updateMediaSessionPositionState();
      });
    }
  }
  async _updateMediaSessionMetaData(track) {
    if ('mediaSession' in navigator === false) {
      return;
    }
    if (this._localPic) {
      URL.revokeObjectURL(this._localPic);
      this._localPic = null;
    }
    let artists = track.ar.map(a => a.name);
    const useLocal = track.isLocal && !track.matched;
    if (useLocal) {
      const blob = await fetch(`atom://get-pic/${track.filePath}`).then(res =>
        res.blob()
      );
      this._localPic = URL.createObjectURL(blob);
    }
    const metadata = {
      title: track.name,
      artist: artists.join(','),
      album: track.al.name ?? track.album.name,
      artwork: [
        {
          src: useLocal ? this._localPic : track.al.picUrl + '?param=224y224',
          type: 'image/jpg',
          sizes: '224x224',
        },
        {
          src: useLocal ? this._localPic : track.al.picUrl + '?param=512y512',
          type: 'image/jpg',
          sizes: '512x512',
        },
      ],
      length: this.currentTrackDuration,
      trackId: this.current,
      url: '/trackid/' + track.id,
    };

    navigator.mediaSession.metadata = new window.MediaMetadata(metadata);
    if (isCreateMpris) {
      ipcRenderer?.send('metadata', metadata);
    }
  }
  _updateMediaSessionPositionState() {
    if ('mediaSession' in navigator === false) {
      return;
    }
    if ('setPositionState' in navigator.mediaSession) {
      navigator.mediaSession.setPositionState({
        duration: ~~(this.currentTrack.dt / 1000),
        playbackRate: 1.0,
        position: this.seek(),
      });
    }
  }
  _nextTrackCallback() {
    if (this._currentTrack.matched !== false) {
      this._scrobble(this._currentTrack, 0, true);
    }
    if (!this.isPersonalFM && this.repeatMode === 'one') {
      this._replaceCurrentTrack(this.currentTrackID);
    } else {
      this._playNextTrack(this.isPersonalFM);
    }
  }
  _loadPersonalFMNextTrack() {
    if (this._personalFMNextLoading) {
      return [false, undefined];
    }
    this._personalFMNextLoading = true;
    return personalFM()
      .then(result => {
        if (!result || !result.data) {
          this._personalFMNextTrack = undefined;
        } else {
          this._personalFMNextTrack = result.data[0];
          this._cacheNextTrack(); // cache next track
        }
        this._personalFMNextLoading = false;
        return [true, this._personalFMNextTrack];
      })
      .catch(() => {
        this._personalFMNextTrack = undefined;
        this._personalFMNextLoading = false;
        return [false, this._personalFMNextTrack];
      });
  }
  _playDiscordPresence(track, seekTime = 0) {
    if (
      process.env.IS_ELECTRON !== true ||
      store.state.settings.enableDiscordRichPresence === false
    ) {
      return null;
    }
    let copyTrack = { ...track };
    copyTrack.dt -= seekTime * 1000;
    ipcRenderer?.send('playDiscordPresence', copyTrack);
  }
  _pauseDiscordPresence(track) {
    if (
      process.env.IS_ELECTRON !== true ||
      store.state.settings.enableDiscordRichPresence === false
    ) {
      return null;
    }
    ipcRenderer?.send('pauseDiscordPresence', track);
  }
  _playNextTrack(isPersonal) {
    if (isPersonal) {
      this.playNextFMTrack();
    } else {
      this.playNextTrack();
    }
  }

  appendTrack(trackID) {
    this.list.append(trackID);
  }
  playNextTrack() {
    // TODO: 切换歌曲时增加加载中的状态
    const [trackID, index] = this._getNextTrack();
    if (trackID === undefined) {
      this._howler?.stop();
      this._setPlaying(false);
      return false;
    }
    this.current = index;
    this._replaceCurrentTrack(trackID);
    return true;
  }
  async playNextFMTrack() {
    if (this._personalFMLoading) {
      return false;
    }

    this._isPersonalFM = true;
    if (!this._personalFMNextTrack) {
      this._personalFMLoading = true;
      let result = null;
      let retryCount = 5;
      for (; retryCount >= 0; retryCount--) {
        result = await personalFM().catch(() => null);
        if (!result) {
          this._personalFMLoading = false;
          store.dispatch('showToast', 'personal fm timeout');
          return false;
        }
        if (result.data?.length > 0) {
          break;
        } else if (retryCount > 0) {
          await delay(1000);
        }
      }
      this._personalFMLoading = false;

      if (retryCount < 0) {
        let content = '获取私人FM数据时重试次数过多，请手动切换下一首';
        store.dispatch('showToast', content);
        console.log(content);
        return false;
      }
      // 这里只能拿到一条数据
      this._personalFMTrack = result.data[0];
    } else {
      if (this._personalFMNextTrack.id === this._personalFMTrack.id) {
        return false;
      }
      this._personalFMTrack = this._personalFMNextTrack;
    }
    if (this._isPersonalFM) {
      this._replaceCurrentTrack(this._personalFMTrack.id);
    }
    this._loadPersonalFMNextTrack();
    return true;
  }
  playPrevTrack() {
    const [trackID, index] = this._getPrevTrack();
    if (trackID === undefined) return false;
    this.current = index;
    this._replaceCurrentTrack(
      trackID,
      true,
      UNPLAYABLE_CONDITION.PLAY_PREV_TRACK
    );
    return true;
  }
  saveSelfToLocalStorage() {
    let player = {};
    for (let [key, value] of Object.entries(this)) {
      if (excludeSaveKeys.includes(key)) continue;
      player[key] = value;
    }

    localStorage.setItem('player', JSON.stringify(player));
  }

  pause() {
    this._howler?.fade(this.volume, 0, PLAY_PAUSE_FADE_DURATION);

    this._howler?.once('fade', () => {
      this._howler?.pause();
      this._setPlaying(false);
      setTitle(null);
      this._pauseDiscordPresence(this._currentTrack);
    });
  }
  play() {
    if (this._howler?.playing()) return;

    this._howler?.play();

    this._howler?.once('play', () => {
      this._howler?.fade(0, this.volume, PLAY_PAUSE_FADE_DURATION);

      this._setPlaying(true);
      if (this._currentTrack.name) {
        setTitle(this._currentTrack);
      }
      this._playDiscordPresence(this._currentTrack, this.seek());
      if (store.state.lastfm.key !== undefined) {
        trackUpdateNowPlaying({
          artist: this.currentTrack.ar[0].name,
          track: this.currentTrack.name,
          album: this.currentTrack.al.name,
          trackNumber: this.currentTrack.no || 1,
          duration: ~~(this.currentTrack.dt / 1000),
        });
      }
    });
  }
  playOrPause() {
    if (this._howler?.playing()) {
      this.pause();
    } else {
      this.play();
    }
  }
  seek(time = null) {
    if (time !== null) {
      this._howler?.seek(time);
      if (this._playing)
        this._playDiscordPresence(this._currentTrack, this.seek());
    }
    return this._howler === null ? 0 : this._howler.seek();
  }
  mute() {
    if (this.volume === 0) {
      this.volume = this._volumeBeforeMuted;
    } else {
      this._volumeBeforeMuted = this.volume;
      this.volume = 0;
    }
  }
  setOutputDevice() {
    if (this._howler?._sounds.length <= 0 || !this._howler?._sounds[0]._node) {
      return;
    }
    this._howler?._sounds[0]._node.setSinkId(store.state.settings.outputDevice);
  }

  replacePlaylist(
    trackIDs,
    playlistSourceID,
    playlistSourceType,
    autoPlayTrackID = 'first'
  ) {
    this._isPersonalFM = false;
    if (!this._enabled) this._enabled = true;
    this._isLocal = playlistSourceType.includes('local');
    this.list = trackIDs;
    this.current = 0;
    this._playlistSource = {
      type: playlistSourceType,
      id: playlistSourceID,
    };
    if (this.shuffle) this._shuffleTheList(autoPlayTrackID);
    if (autoPlayTrackID === 'first') {
      this._replaceCurrentTrack(this.list[0]);
    } else {
      this.current = trackIDs.indexOf(autoPlayTrackID);
      this._replaceCurrentTrack(autoPlayTrackID);
    }
  }
  playAlbumByID(id, trackID = 'first') {
    getAlbum(id).then(data => {
      let trackIDs = data.songs.map(t => t.id);
      this.replacePlaylist(trackIDs, id, 'album', trackID);
    });
  }
  playPlaylistByID(id, trackID = 'first', noCache = false) {
    console.debug(
      `[debug][Player.js] playPlaylistByID 👉 id:${id} trackID:${trackID} noCache:${noCache}`
    );
    getPlaylistDetail(id, noCache).then(data => {
      let trackIDs = data.playlist.trackIds.map(t => t.id);
      this.replacePlaylist(trackIDs, id, 'playlist', trackID);
    });
  }
  playArtistByID(id, trackID = 'first') {
    getArtist(id).then(data => {
      let trackIDs = data.hotSongs.map(t => t.id);
      this.replacePlaylist(trackIDs, id, 'artist', trackID);
    });
  }
  playTrackOnListByID(id, listName = 'default') {
    if (listName === 'default') {
      this._current = this._list.findIndex(t => t === id);
    }
    this._replaceCurrentTrack(id);
  }
  playIntelligenceListById(id, trackID = 'first', noCache = false) {
    getPlaylistDetail(id, noCache).then(data => {
      const randomId = Math.floor(
        Math.random() * (data.playlist.trackIds.length + 1)
      );
      const songId = data.playlist.trackIds[randomId].id;
      intelligencePlaylist({ id: songId, pid: id }).then(result => {
        let trackIDs = result.data.map(t => t.id);
        this.replacePlaylist(trackIDs, id, 'playlist', trackID);
      });
    });
  }
  addTrackToPlayNext(trackID, playNow = false, addTohead = false) {
    addTohead
      ? this._playNextList.unshift(trackID)
      : this._playNextList.push(trackID);
    if (playNow) {
      this.playNextTrack();
    }
  }
  playPersonalFM() {
    this._isPersonalFM = true;
    this._isLocal = false;
    if (!this._enabled) this._enabled = true;
    if (this.currentTrackID !== this._personalFMTrack.id) {
      this._replaceCurrentTrack(this._personalFMTrack.id, true);
    } else {
      this.playOrPause();
    }
  }
  async moveToFMTrash() {
    this._isPersonalFM = true;
    let id = this._personalFMTrack.id;
    if (await this.playNextFMTrack()) {
      fmTrash(id);
    }
  }

  sendSelfToIpcMain() {
    if (process.env.IS_ELECTRON !== true) return false;
    let liked = store.state.liked.songs.includes(this.currentTrack.id);
    ipcRenderer?.send('player', {
      playing: this.playing,
      likedCurrentTrack: liked,
      isPersionalFM: this._isPersonalFM,
    });
    setTrayLikeState(liked);
  }

  switchRepeatMode() {
    if (this._repeatMode === 'on') {
      this.repeatMode = 'one';
    } else if (this._repeatMode === 'one') {
      this.repeatMode = 'off';
    } else {
      this.repeatMode = 'on';
    }
    ipcRenderer?.send('switchRepeatMode', this.repeatMode);
  }
  switchShuffle() {
    this.shuffle = !this.shuffle;
    ipcRenderer?.send('switchShuffle', this.shuffle);
  }
  switchReversed() {
    this.reversed = !this.reversed;
  }

  clearPlayNextList() {
    this._playNextList = [];
  }
  removeTrackFromQueue(index) {
    this._playNextList.splice(index, 1);
  }
  getRate() {
    return this._howler?.rate() || 1;
  }
  setRate(value) {
    this._howler?.rate(value);
  }
}

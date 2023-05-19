import { isAccountLoggedIn, isLooseLoggedIn } from '@/utils/auth';
import { likeATrack } from '@/api/track';
import { getPlaylistDetail } from '@/api/playlist';
import { getTrackDetail } from '@/api/track';
import { search } from '@/api/others';
import { getAlbum } from '@/api/album';
import { localTracksFilter, localTrackParser } from '@/utils/localSongParser';
import { randomNum } from '@/utils/common';
import {
  userPlaylist,
  userPlayHistory,
  userLikedSongsIDs,
  likedAlbums,
  likedArtists,
  likedMVs,
  cloudDisk,
  userAccount,
} from '@/api/user';

const fs = require('fs');
const path = require('path');
const mm = require('music-metadata');

function splitArtist(artist) {
  if (artist.includes('&')) {
    artist = artist.split('&');
  } else if (artist.includes('、')) {
    artist = artist.split('、');
  } else if (artist.includes(',')) {
    artist = artist.split(',');
  } else if (artist.includes('/')) {
    artist = artist.split('/');
  }
  return artist;
}

async function getLocalAlbum({ state, commit }, filePath) {
  const metadata = await mm.parseFile(filePath);
  const { common } = metadata;

  let album = state.localMusic.albums.find(a => a.name === common.album);
  if (album) {
    return album.id;
  } else {
    let arForSearch = common.albumartist || common.artist;
    arForSearch = splitArtist(arForSearch);
    arForSearch = Array.isArray(arForSearch) ? arForSearch[0] : arForSearch;
    album = {
      id: state.localMusic.albumsIdCounter,
      isLocal: true,
      arForSearch: arForSearch,
      songForSearch: common.title,
      matched: false,
      name: common.album,
      onlineAlbum: null,
      picUrl:
        'https://p2.music.126.net/UeTuwE7pvjBpypWLudqukA==/3132508627578625.jpg',
    };
    state.localMusic.albumsIdCounter++;
    commit('addLocalXXX', { name: 'albums', data: album });
    return album.id;
  }
}

async function getArtists({ state, commit }, filePath) {
  const artistIDs = [];

  const metadata = await mm.parseFile(filePath);
  const { common } = metadata;
  let artists = common.artists[0];
  artists = splitArtist(artists);
  if (typeof artists === 'string') {
    artists = [artists];
  }

  for (const artist of artists) {
    const foundArtist = state.localMusic.artists.find(a => a.name === artist);
    if (foundArtist) {
      if (!foundArtist.matched) {
        foundArtist.picUrl =
          'https://p1.music.126.net/VnZiScyynLG7atLIZ2YPkw==/18686200114669622.jpg';
      }
      artistIDs.push(foundArtist.id);
    } else {
      let arForSearch = common.albumartist || common.artist;
      arForSearch = splitArtist(arForSearch);
      arForSearch = Array.isArray(arForSearch) ? arForSearch[0] : arForSearch;
      const ar = {
        id: state.localMusic.artistsIdCounter,
        name: artist,
        matched: false,
        arForSearch: arForSearch,
        songForSearch: common.title,
        isLocal: true,
        onlineArtist: null,
        picUrl:
          'https://p1.music.126.net/VnZiScyynLG7atLIZ2YPkw==/18686200114669622.jpg',
      };
      commit('addLocalXXX', { name: 'artists', data: ar });
      artistIDs.push(ar.id);
      state.localMusic.artistsIdCounter++;
    }
  }
  return artistIDs;
}

async function getTrack({ state, commit }, filePath) {
  const stats = fs.statSync(filePath);
  const birthDate = stats.ctime.toLocaleDateString();
  const formatDate = new Date(birthDate).toISOString().slice(0, 10);
  const metadata = await mm.parseFile(filePath);

  const { common } = metadata;
  if (!common.title) return;

  let foundSong = state.localMusic.tracks.find(
    obj => obj.filePath === filePath
  );
  if (foundSong) {
    if (!foundSong.lyricDelay) {
      foundSong.lyricDelay = 0;
    }
    return foundSong.id;
  } else {
    let arForSearch = common.albumartist || common.artist;
    arForSearch = splitArtist(arForSearch);
    arForSearch = Array.isArray(arForSearch) ? arForSearch[0] : arForSearch;
    foundSong = {
      id: state.localMusic.trackIdCounter,
      createTime: formatDate,
      name: common.title,
      dt: metadata.format.duration * 1000,
      isLocal: true,
      lyricDelay: 0,
      arForSearch: arForSearch,
      matched: false,
      filePath: filePath,
      onlineTrack: null,
      picUrl:
        'https://p2.music.126.net/UeTuwE7pvjBpypWLudqukA==/3132508627578625.jpg',
    };
    commit('addLocalXXX', { name: 'tracks', data: foundSong });
    state.localMusic.trackIdCounter++;
    return foundSong.id;
  }
}

function delay(time) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, time);
  });
}

export default {
  showToast({ state, commit }, text) {
    if (state.toast.timer !== null) {
      clearTimeout(state.toast.timer);
      commit('updateToast', { show: false, text: '', timer: null });
    }
    commit('updateToast', {
      show: true,
      text,
      timer: setTimeout(() => {
        commit('updateToast', {
          show: false,
          text: state.toast.text,
          timer: null,
        });
      }, 3200),
    });
  },
  loadLocalMusic({ state, commit }, clear = true) {
    const musicFileExtensions = /\.(mp3|flac|alac|m4a|aac|wav)$/i;
    const folderPath = state.settings.localMusicFolderPath;
    if (!folderPath) return;
    if (clear) {
      commit('clearLocalMusic');
    }
    const walk = async folder => {
      const files = fs.readdirSync(folder);
      for (const file of files) {
        const filePath = path.join(folder, file);
        const stats = fs.statSync(filePath);
        if (stats.isFile() && musicFileExtensions.test(filePath)) {
          const foundTrack = state.localMusic.tracks.find(
            track => track.filePath === filePath
          );
          const trackID = await getTrack({ state, commit }, filePath, clear);
          const albumID = await getLocalAlbum({ state, commit }, filePath);
          const artistIDs = await getArtists({ state, commit }, filePath);
          if (!foundTrack) {
            const song = {
              id: trackID,
              show: true,
              trackID: trackID,
              albumID: albumID,
              artistIDs: artistIDs,
            };
            commit('addLocalXXX', { name: 'songs', data: song });
          } else {
            const song = state.localMusic.songs.find(
              s => s.trackID === foundTrack.id
            );
            if (clear) {
              song.show = true;
            }
          }
        } else if (stats.isDirectory()) {
          await walk(filePath);
        }
      }
    };
    walk(folderPath);
  },
  async updateTrack({ state }) {
    const songs = state.localMusic.songs;
    const tracks = state.localMusic.tracks;
    const albums = state.localMusic.albums;
    let rawDelay = 20 * 1000;
    let code = 200;
    for (let i = 0; i < tracks.length; i++) {
      const song = songs[i];
      const track = tracks.find(t => t.id === song.trackID);
      const album = albums.find(a => a.id === song.albumID);
      if (track.matched && album.matched) {
        code = 0;
      } else {
        const keyword = {
          keywords: `${track.name} ${track.arForSearch}`,
          type: 1,
          limit: 50,
        };
        code = await search(keyword).then(async result => {
          if (result.code === 200) {
            if (result.result.songs?.length > 0) {
              const matchTrack = result.result.songs.filter(item => {
                return (
                  item.name === track.name &&
                  item.artists.some(i => i.name === track.arForSearch) &&
                  Math.abs(item.duration - track.dt) <= 5 * 1000
                );
              });
              if (matchTrack.length > 0) {
                const trackIndex = randomNum(0, matchTrack.length - 1);
                track.onlineTrack = matchTrack[trackIndex];
                track.matched = true;
                const onlineTrackAlbum = await getAlbum(
                  track.onlineTrack.album.id
                );
                album.onlineAlbum = onlineTrackAlbum.album;
                album.matched = true;
              } else {
                const matchTrack = result.result.songs.filter(item => {
                  return (
                    item.name === track.name &&
                    Math.abs(item.duration - track.dt) <= 5 * 1000
                  );
                });
                track.onlineTrack =
                  matchTrack.length !== 0
                    ? matchTrack[randomNum(0, matchTrack.length - 1)]
                    : result.result.songs[0];
                track.matched = true;
                const onlineTrackAlbum = await getAlbum(
                  track.onlineTrack.album.id
                );
                album.onlineAlbum = onlineTrackAlbum.album;
                album.matched = true;
              }
              return result.code;
            }
            return result.code;
          }
          return result.code;
        });
      }
      const delayTime = code === 0 ? 0 : rawDelay;
      await delay(delayTime);
    }
  },
  createLocalPlayList({ state, commit }, params) {
    const playlist = {
      id: state.localMusic.playlistIdCounter,
      name: params.name,
      description: params.description,
      coverImgUrl:
        'https://p1.music.126.net/jWE3OEZUlwdz0ARvyQ9wWw==/109951165474121408.jpg',
      updateTime: new Date().getTime(),
      trackCount: 0,
      trackIds: [],
    };
    commit('addLocalXXX', { name: 'playlists', data: playlist });
    state.localMusic.playlistIdCounter++;
    return playlist;
  },
  addTrackToLocalPlaylist({ state }, params) {
    const playlist = state.localMusic.playlists.find(p => p.id === params.pid);
    if (playlist) {
      const song = state.localMusic.songs.find(s => s.id === params.tracks);
      const track = localTrackParser(song.id);
      if (playlist.trackIds.includes(track.id)) {
        return { code: 500, message: '歌曲已存在' };
      }
      playlist.trackIds.push(track.id);
      playlist.coverImgUrl = track.picUrl;
      playlist.trackCount = playlist.trackIds.length;
      playlist.updateTime = new Date().getTime();
      return { code: 200 };
    }
    return { code: 404, message: '歌单不存在' };
  },
  rmTrackFromLocalPlaylist({ state }, params) {
    const playlist = state.localMusic.playlists.find(p => p.id === params.pid);
    if (playlist) {
      const idx = playlist.trackIds.indexOf(params.tracks);
      if (idx !== -1) {
        playlist.trackIds.splice(idx, 1);
        playlist.trackCount = playlist.trackIds.length;
        const showSongId = playlist.trackIds[playlist.trackIds.length - 1];
        const showTrack = localTrackParser(showSongId);
        playlist.coverImgUrl =
          showTrack?.picUrl ||
          'https://p1.music.126.net/jWE3OEZUlwdz0ARvyQ9wWw==/109951165474121408.jpg';
        playlist.updateTime = new Date().getTime();
        return { code: 200 };
      }
      return { code: 404, message: '歌曲不存在于歌单中' };
    }
    return { code: 404, message: '歌单不存在' };
  },
  deleteLocalPlaylist({ state }, pid) {
    const playlists = state.localMusic.playlists;
    const idx = playlists.findIndex(p => p.id === pid);
    if (idx !== -1) {
      playlists.splice(idx, 1);
      return { code: 200 };
    }
    return { code: 404, message: '歌单不存在' };
  },
  fetchLatestSongs({ commit }) {
    const trackIDs = localTracksFilter('descend')
      .filter(t => t.matched)
      .map(t => t.onlineTrack.id);
    commit('updateLocalXXX', { name: 'latestAddTracks', data: trackIDs });
  },
  async updateArtists({ state }) {
    let code = 200;
    let rawDelay = 20 * 1000;
    const artists = state.localMusic.artists;
    for (const artist of artists) {
      if (artist.matched) {
        code = 0;
      } else {
        const keyword = {
          keywords: artist.name,
          type: 100,
          limit: 5,
        };
        code = await search(keyword).then(result => {
          if (result.code === 200) {
            if (result.result.artists && result.result.artists.length > 0) {
              artist.onlineArtist =
                result.result.artists.find(a => a.name === artist.name) ||
                result.result.artists[0];
              artist.matched = true;
            }
          }
          return result.code;
        });
      }
      const delayTime = code === 0 ? 0 : rawDelay;
      await delay(delayTime);
    }
  },
  likeATrack({ state, commit, dispatch }, id) {
    if (!isAccountLoggedIn()) {
      dispatch('showToast', '此操作需要登录网易云账号');
      return;
    }
    let like = true;
    if (state.liked.songs.includes(id)) like = false;
    likeATrack({ id, like })
      .then(() => {
        if (like === false) {
          commit('updateLikedXXX', {
            name: 'songs',
            data: state.liked.songs.filter(d => d !== id),
          });
        } else {
          let newLikeSongs = state.liked.songs;
          newLikeSongs.push(id);
          commit('updateLikedXXX', {
            name: 'songs',
            data: newLikeSongs,
          });
        }
        dispatch('fetchLikedSongsWithDetails');
        const { ipcRenderer } = require('electron');
        ipcRenderer.send('updateTrayLikeState');
      })
      .catch(() => {
        dispatch('showToast', '操作失败，专辑下架或版权锁定');
      });
  },
  fetchLikedSongs: ({ state, commit }) => {
    if (!isLooseLoggedIn()) return;
    if (isAccountLoggedIn()) {
      return userLikedSongsIDs({ uid: state.data.user.userId }).then(result => {
        if (result.ids) {
          commit('updateLikedXXX', {
            name: 'songs',
            data: result.ids,
          });
        }
      });
    } else {
      // TODO:搜索ID登录的用户
    }
  },
  fetchLikedSongsWithDetails: ({ state, commit }) => {
    return getPlaylistDetail(state.data.likedSongPlaylistID, true).then(
      result => {
        if (result.playlist?.trackIds?.length === 0) {
          return new Promise(resolve => {
            resolve();
          });
        }
        return getTrackDetail(
          result.playlist.trackIds
            .slice(0, 12)
            .map(t => t.id)
            .join(',')
        ).then(result => {
          commit('updateLikedXXX', {
            name: 'songsWithDetails',
            data: result.songs,
          });
        });
      }
    );
  },
  fetchLikedPlaylist: ({ state, commit }) => {
    if (!isLooseLoggedIn()) return;
    if (isAccountLoggedIn()) {
      return userPlaylist({
        uid: state.data.user?.userId,
        limit: 2000, // 最多只加载2000个歌单（等有用户反馈问题再修）
        timestamp: new Date().getTime(),
      }).then(result => {
        if (result.playlist) {
          commit('updateLikedXXX', {
            name: 'playlists',
            data: result.playlist,
          });
          // 更新用户”喜欢的歌曲“歌单ID
          commit('updateData', {
            key: 'likedSongPlaylistID',
            value: result.playlist[0].id,
          });
        }
      });
    } else {
      // TODO:搜索ID登录的用户
    }
  },
  fetchLikedAlbums: ({ commit }) => {
    if (!isAccountLoggedIn()) return;
    return likedAlbums({ limit: 2000 }).then(result => {
      if (result.data) {
        commit('updateLikedXXX', {
          name: 'albums',
          data: result.data,
        });
      }
    });
  },
  fetchLikedArtists: ({ commit }) => {
    if (!isAccountLoggedIn()) return;
    return likedArtists({ limit: 2000 }).then(result => {
      if (result.data) {
        commit('updateLikedXXX', {
          name: 'artists',
          data: result.data,
        });
      }
    });
  },
  fetchLikedMVs: ({ commit }) => {
    if (!isAccountLoggedIn()) return;
    return likedMVs({ limit: 1000 }).then(result => {
      if (result.data) {
        commit('updateLikedXXX', {
          name: 'mvs',
          data: result.data,
        });
      }
    });
  },
  fetchCloudDisk: ({ commit }) => {
    if (!isAccountLoggedIn()) return;
    // FIXME: #1242
    return cloudDisk({ limit: 1000 }).then(result => {
      if (result.data) {
        commit('updateLikedXXX', {
          name: 'cloudDisk',
          data: result.data,
        });
      }
    });
  },
  fetchPlayHistory: ({ state, commit }) => {
    if (!isAccountLoggedIn()) return;
    return Promise.all([
      userPlayHistory({ uid: state.data.user?.userId, type: 0 }),
      userPlayHistory({ uid: state.data.user?.userId, type: 1 }),
    ]).then(result => {
      const data = {};
      const dataType = { 0: 'allData', 1: 'weekData' };
      if (result[0] && result[1]) {
        for (let i = 0; i < result.length; i++) {
          const songData = result[i][dataType[i]].map(item => {
            const song = item.song;
            song.playCount = item.playCount;
            return song;
          });
          data[[dataType[i]]] = songData;
        }
        commit('updateLikedXXX', {
          name: 'playHistory',
          data: data,
        });
      }
    });
  },
  fetchUserProfile: ({ commit }) => {
    if (!isAccountLoggedIn()) return;
    return userAccount().then(result => {
      if (result.code === 200) {
        commit('updateData', { key: 'user', value: result.profile });
      }
    });
  },
};

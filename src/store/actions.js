import { isAccountLoggedIn, isLooseLoggedIn } from '@/utils/auth';
import { likeATrack } from '@/api/track';
import { getPlaylistDetail } from '@/api/playlist';
import { getTrackDetail } from '@/api/track';
import { getArtist } from '@/api/artist';
import { search } from '@/api/others';
import { getAlbum } from '@/api/album';
import { randomNum } from '@/utils/common';
import { importFromJson, createMD5 } from '@/utils/migrations';
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
import cloneDeep from 'lodash/cloneDeep';

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

  // 本地音乐从最初版本迁移到v1版本
  localMusicMigration({ state, commit, dispatch }) {
    const localMusic = state.localMusic;
    if (localMusic.version === 'v1') return;
    const tracks = localMusic.tracks;
    if (!tracks.length) return;
    dispatch('showToast', '正在进行本地音乐迁移...');
    importFromJson(cloneDeep(localMusic)).then(({ playlists, tracks }) => {
      const albumArray = tracks.map(tr => tr.al);
      const albums = [...new Map(albumArray.map(a => [a.id, a])).values()];
      const artistArray = tracks.map(tr => tr.ar).flat(Infinity);
      const artists = [...new Map(artistArray.map(a => [a.id, a])).values()];
      const data = {
        version: 'v1',
        trackIdCounter: tracks.length + 1,
        albumsIdCounter: albums.length + 1,
        artistsIdCounter: artists.length + 1,
        playlistIdCounter: playlists.length + 1,
        playlists: playlists,
        tracks: tracks,
        sortBy: localMusic.sortBy,
      };
      commit('updateLocalMusic', data);
      dispatch('showToast', '本地音乐迁移完成');
    });
  },

  clearDeletedMusic({ state, dispatch }) {
    const tracks = state.localMusic?.tracks;
    if (tracks.length === 0) return;
    for (let i = tracks.length - 1; i >= 0; i--) {
      const track = tracks[i];
      try {
        fs.accessSync(track.filePath, fs.constants.F_OK);
      } catch (err) {
        console.log('File not exists:', track.filePath);
        dispatch('removeLocalTrack', { id: track.id });
        tracks.splice(i, 1);
      }
    }
  },

  async loadLocalMusic({ state, commit }) {
    const musicFileExtensions = /\.(mp3|flac|alac|m4a|aac|wav)$/i;
    const folderPath = state.settings.localMusicFolderPath;
    if (!folderPath) return;
    if (!fs.existsSync(folderPath)) return;

    const trackArray = [];
    const albumArray = [];
    const artistsArray = [];

    const getArtists = common => {
      let artists = splitArtist(common.albumartist || common.artist);
      artists = typeof artists === 'string' ? [artists] : artists;

      const result = [];
      for (const artist of artists) {
        const foundAr = artistsArray.find(ar => ar.name === artist);
        let artistObj;
        if (foundAr) {
          artistObj = foundAr;
        } else {
          artistObj = {
            id: state.localMusic.artistsIdCounter++,
            name: artist,
            matched: false,
            picUrl:
              'https://p1.music.126.net/VnZiScyynLG7atLIZ2YPkw==/18686200114669622.jpg',
          };
          artistsArray.push(artistObj);
        }
        result.push(artistObj);
      }
      return result;
    };

    const getAlbums = common => {
      const name = common.album;
      const foundAlbum = albumArray.find(al => al.name === name);
      let albumObj;
      if (!foundAlbum) {
        albumObj = {
          id: state.localMusic.albumsIdCounter++,
          name: name,
          artist: getArtists(common)[0] ?? {},
          matched: false,
          picUrl:
            'https://p2.music.126.net/UeTuwE7pvjBpypWLudqukA==/3132508627578625.jpg',
        };
        albumArray.push(albumObj);
      } else {
        albumObj = foundAlbum;
      }
      return albumObj;
    };

    const walk = async folder => {
      const files = fs.readdirSync(folder);
      for (const file of files) {
        const filePath = path.join(folder, file);
        const stats = fs.statSync(filePath);

        if (stats.isFile() && musicFileExtensions.test(filePath)) {
          const foundTrack = state.localMusic.tracks?.find(
            track => track.filePath === filePath
          );
          if (!foundTrack) {
            const metadata = await mm.parseFile(filePath);
            const { common, format } = metadata;
            const birthDate = new Date(stats.birthtime).getTime();
            const track = {
              id: state.localMusic.trackIdCounter++,
              show: true,
              delete: false,
              isLocal: true,
              matched: false,
              lyricDelay: 0,
              md5: createMD5(filePath),
              createTime: birthDate,
              name: common.title,
              dt: format.duration * 1000,
              filePath: filePath,
              alia: [],
              al: getAlbums(common),
              ar: getArtists(common),
              picUrl:
                'https://p2.music.126.net/UeTuwE7pvjBpypWLudqukA==/3132508627578625.jpg',
            };
            trackArray.push(track);
          } else {
            foundTrack.al.matched = foundTrack.matched;
            foundTrack.ar.map(artist => (artist.matched = foundTrack.matched));
            foundTrack.show = true;
            foundTrack.delete =
              foundTrack.delete === undefined ? false : foundTrack.delete;
          }
        } else if (stats.isDirectory()) {
          await walk(filePath);
        }
      }
    };
    await walk(folderPath);
    commit('addLocalMusicXXX', {
      name: 'tracks',
      data: trackArray,
    });
  },

  async updateTracks({ state }) {
    if (!state.settings.localMusicMatchStatus) return;
    const tracks = state.localMusic?.tracks;
    let rawDelay = 20 * 1000;
    let code = 200;
    for (const track of tracks) {
      if (!state.settings.localMusicMatchStatus) break;
      if (track.matched) {
        code = 0;
      } else {
        const search_key = track.ar.map(ar => ar.name).join(' ');
        const keyword = {
          keywords: `${track.name} ${search_key}`,
          type: 1,
          limit: 50,
        };
        code = await search(keyword).then(async result => {
          if (result.code === 200) {
            if (result?.result?.songs?.length > 0) {
              let matchTracks = result.result.songs.filter(item => {
                return (
                  item.name === track.name &&
                  Math.abs(item.duration - track.dt) <= 5 * 1000 &&
                  track.ar.every(artist =>
                    item.artists.some(sa => sa.name === artist.name)
                  )
                );
              });
              if (matchTracks.length === 0) {
                matchTracks = result.result.songs.filter(item => {
                  return (
                    item.name === track.name &&
                    Math.abs(item.duration - track.dt) <= 5 * 1000
                  );
                });
              }
              if (matchTracks.length === 0) return result.code;
              const trackIndex = randomNum(0, matchTracks.length - 1);
              const matchtrack = matchTracks[trackIndex];
              track.id = matchtrack.id;
              track.alia = matchtrack.alias;
              track.al.id = matchtrack.album.id;
              const onlineAlbum = await getAlbum(matchtrack.album.id);
              track.al.picUrl = onlineAlbum.album.picUrl;
              track.al.artist = onlineAlbum.album.artist ?? {};
              track.picUrl = onlineAlbum.album.picUrl;
              for (const artist of matchtrack.artists) {
                getArtist(artist.id).then(result => {
                  const ar = track.ar.find(ar => ar.name === artist.name);
                  if (ar) {
                    ar.id = result.artist.id;
                    ar.picUrl = result.artist.picUrl;
                  }
                });
              }
              track.matched = true;
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

  removeLocalTrack({ state, dispatch }, params) {
    const track = state.localMusic.tracks.find(t => t.id === params.id);
    track.delete = true;

    const playlists = state.localMusic.playlists.filter(p =>
      p.trackIds.includes(track.id)
    );
    for (const playlist of playlists) {
      dispatch('rmTrackFromLocalPlaylist', {
        pid: playlist.id,
        tracks: track.id,
      });
    }
  },

  async accurateMatchTrack({ state }, params) {
    const track = state.localMusic.tracks.find(t => t.id === params.id);
    getTrackDetail(params.title).then(async data => {
      track.id = params.title;
      track.alia = data.songs[0].alia;
      track.al = data.songs[0].al;
      track.picUrl = data.songs[0].al.picUrl;
      track.matched = true;
    });
  },

  createLocalPlayList({ state, commit }, params) {
    const playlist = {
      id: state.localMusic?.playlistIdCounter,
      name: params.name,
      description: params.description,
      coverImgUrl:
        'https://p1.music.126.net/jWE3OEZUlwdz0ARvyQ9wWw==/109951165474121408.jpg',
      updateTime: new Date().getTime(),
      trackCount: 0,
      trackIds: [],
    };
    commit('addLocalMusicXXX', { name: 'playlists', data: [playlist] });
    state.localMusic.playlistIdCounter++;
    return playlist;
  },
  async addTrackToLocalPlaylist({ state }, params) {
    const playlist = state.localMusic?.playlists.find(p => p.id === params.pid);
    if (playlist) {
      for (const trackid of params.tracks) {
        const track = state.localMusic?.tracks.find(t => t.id === trackid);
        if (playlist.trackIds.includes(track.id)) continue;
        playlist.trackIds.push(track.id);
        playlist.coverImgUrl = track.matched
          ? track.picUrl
          : `atom://get-pic/${track.filePath}`;
        playlist.trackCount = playlist.trackIds.length;
        playlist.updateTime = new Date().getTime();
      }
      return { code: 200 };
    }
    return { code: 404, message: '歌单不存在' };
  },
  async rmTrackFromLocalPlaylist({ state }, params) {
    const playlist = state.localMusic.playlists.find(p => p.id === params.pid);
    if (playlist) {
      const idx = playlist.trackIds.indexOf(params.tracks);
      if (idx !== -1) {
        playlist.trackIds.splice(idx, 1);
        playlist.trackCount = playlist.trackIds.length;
        const showId = playlist.trackIds[playlist.trackIds.length - 1];
        const showTrack = state.localMusic.tracks.find(t => t.id === showId);
        playlist.coverImgUrl = showTrack?.matched
          ? showTrack?.picUrl
          : `atom://get-pic/${showTrack?.filePath}`;
        playlist.updateTime = new Date().getTime();
        return { code: 200 };
      }
      return { code: 404, message: '歌曲不存在于歌单中' };
    }
    return { code: 404, message: '歌单不存在' };
  },
  deleteLocalPlaylist({ state }, pid) {
    const playlists = state.localMusic?.playlists;
    const idx = playlists.findIndex(p => p.id === pid);
    if (idx !== -1) {
      playlists.splice(idx, 1);
      return { code: 200 };
    }
    return { code: 404, message: '歌单不存在' };
  },
  likeATrack({ state, commit, dispatch }, id) {
    if (!isAccountLoggedIn()) {
      dispatch('showToast', '此操作需要登录网易云账号');
      return;
    }
    let like = true;
    if (state.liked.songs.includes(id)) like = false;
    likeATrack({ id, like })
      .then(res => {
        if (res.code === 200) {
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
          ipcRenderer.send('updateTrayLikeState', like);
        } else {
          dispatch('showToast', '操作失败，专辑下架或版权锁定');
        }
      })
      .catch(() => {
        dispatch('showToast', '操作失败，专辑下架或版权锁定');
      });
  },
  deleteMatchTrack({ state }, trackID) {
    const track = state.localMusic?.tracks.find(t => t.id === trackID);
    // console.log('deleteMatchTrack', track);
    track.picUrl =
      'https://p2.music.126.net/UeTuwE7pvjBpypWLudqukA==/3132508627578625.jpg';
    track.alia = [];
    track.matched = false;
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

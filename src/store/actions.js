// import store, { state, dispatch, commit } from "@/store";
import { isAccountLoggedIn, isLooseLoggedIn } from '@/utils/auth';
import { likeATrack } from '@/api/track';
import { getPlaylistDetail } from '@/api/playlist';
import { getTrackDetail } from '@/api/track';
// import { search } from '@/api/others';
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

function getArtist(artist) {
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

function getAlbum({ state, commit }, common) {
  let matchAlbum = state.localMusic.albums.find(
    a => a.rawName === common.album || a.name === common.album
  );
  if (matchAlbum) {
    matchAlbum.show = true;
    commit('updateAlbum', matchAlbum);
  } else {
    let id = state.localMusic.albumsIdCounter;
    matchAlbum = {
      id: id,
      show: true,
      name: common.album,
      rawName: null,
      picUrl:
        'https://p2.music.126.net/UeTuwE7pvjBpypWLudqukA==/3132508627578625.jpg',
    };
    state.localMusic.albumsIdCounter++;
    commit('addAnAlbum', matchAlbum);
  }
  return matchAlbum;
}

function getArtists({ state, commit }, common) {
  const allArtists = [];

  let artists = common.artists[0];
  artists = getArtist(artists);
  if (typeof artists === 'string') {
    artists = [artists];
  }

  for (const artist of artists) {
    const foundArtist = state.localMusic.artists.find(a => a.name === artist);
    if (foundArtist) {
      foundArtist.show = true;
      commit('updateArtist', foundArtist);
      allArtists.push(foundArtist);
    } else {
      const ar = {
        id: state.localMusic.artistsIdCounter,
        name: artist,
        show: true,
        picUrl:
          'https://p2.music.126.net/UeTuwE7pvjBpypWLudqukA==/3132508627578625.jpg',
      };
      commit('addAnArtist', ar);
      allArtists.push(ar);
      state.localMusic.artistsIdCounter++;
    }
  }
  return allArtists;
}

function getLocalSongs({ state, commit }, { metadata, filePath }) {
  const { common } = metadata;
  if (!common.title) return;

  const album = getAlbum({ state, commit }, common);
  const artists = getArtists({ state, commit }, common);
  const foundSong = state.localMusic.songs.find(
    obj => obj.name === common.title
  );
  if (foundSong) {
    foundSong.show = true;
    commit('updateAsong', foundSong);
  } else {
    const song = {
      id: state.localMusic.songsIdCounter,
      name: common.title,
      ar: artists,
      al: album,
      dt: metadata.format.duration * 1000,
      show: true,
      filePath: filePath,
      picUrl:
        'https://p2.music.126.net/UeTuwE7pvjBpypWLudqukA==/3132508627578625.jpg',
    };
    commit('addAMusic', song);
    state.localMusic.songsIdCounter++;
  }
}

// function updateAlbum({ state, commit }, common) {
//   let artist = common.albumartist || common.artist;
//   artist = getArtist(artist);
//   artist = artist[0];
//   const keyword = {
//     keywords: `${common.title} ${artist}`,
//     type: 10,
//     limit: 16,
//   };
//   search(keyword).then(result => {
//     let matchAlbum;
//     matchAlbum =
//       result.result.albums.find(obj => obj.containedSong === common.title) ||
//       result.result.albums.find(obj => obj.artist.name === artist) ||
//       result.result.albums[0];
//     if (!matchAlbum) {
//       let id = state.localMusic.albumsIdCounter;
//       matchAlbum = {
//         id: id,
//         name: common.album,
//         picUrl:
//           'https://p2.music.126.net/UeTuwE7pvjBpypWLudqukA==/3132508627578625.jpg',
//       };
//       state.localMusic.albumsIdCounter++;
//     }
//     matchAlbum.rawName = common.album;
//     commit('addAnAlbum', matchAlbum);
//     return matchAlbum;
//   });
// }

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
  loadLocalMusic({ state, commit }) {
    const musicFileExtensions = /\.(mp3|flac|alac|m4a|aac|wav)$/i;
    const folderPath = state.settings.localMusicFolderPath;
    if (!folderPath) return;
    commit('clearLocalMusic');
    const fs = require('fs');
    const path = require('path');
    const mm = require('music-metadata');

    const walk = async folder => {
      const files = fs.readdirSync(folder);
      files.forEach(async file => {
        const filePath = path.join(folder, file);
        const stats = fs.statSync(filePath);
        if (stats.isFile() && musicFileExtensions.test(filePath)) {
          const metadata = await mm.parseFile(filePath);
          getLocalSongs({ state, commit }, { metadata, filePath });
        } else if (stats.isDirectory()) {
          walk(filePath);
        }
      });
    };
    walk(folderPath);
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

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
const fs = require('fs');
const path = require('path');
const mm = require('music-metadata');

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

async function getAlbum({ state, commit }, filePath) {
  const metadata = await mm.parseFile(filePath);
  const { common } = metadata;

  let album = state.localMusic.albums.find(a => a.name === common.album);
  if (album) {
    album.show = true;
    commit('updateAlbum', album);
  } else {
    album = {
      id: state.localMusic.albumsIdCounter,
      show: true,
      isLocal: true,
      name: common.album,
      onlineAlbum: null,
      picUrl:
        'https://p2.music.126.net/UeTuwE7pvjBpypWLudqukA==/3132508627578625.jpg',
    };
    state.localMusic.albumsIdCounter++;
    commit('addAnAlbum', album);
  }
  return album.id;
}

async function getArtists({ state, commit }, filePath) {
  const artistIDs = [];

  const metadata = await mm.parseFile(filePath);
  const { common } = metadata;
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
      artistIDs.push(foundArtist.id);
    } else {
      const ar = {
        id: state.localMusic.artistsIdCounter,
        name: artist,
        show: true,
        isLocal: true,
        onlineArtist: null,
        picUrl:
          'https://p2.music.126.net/UeTuwE7pvjBpypWLudqukA==/3132508627578625.jpg',
      };
      commit('addAnArtist', ar);
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
    foundSong.show = true;
    commit('updateATrack', foundSong);
  } else {
    foundSong = {
      id: state.localMusic.trackIdCounter,
      createTime: formatDate,
      name: common.title,
      dt: metadata.format.duration * 1000,
      isLocal: true,
      show: true,
      filePath: filePath,
      onlineTrack: null,
      picUrl:
        'https://p2.music.126.net/UeTuwE7pvjBpypWLudqukA==/3132508627578625.jpg',
    };
    commit('addATrack', foundSong);
    state.localMusic.trackIdCounter++;
  }
  return foundSong.id;
}

// updateAlbum({ state, commit }, albumID) {
//   const matchAl = state.localMusic.albums.find(al => al.id === albumID);
//   if (matchAl.matched) return;
//   const keyword = {
//     keywords: `${matchAl.song} ${matchAl.arForSearch}`,
//     type: 10,
//     limit: 16,
//   };
//   search(keyword).then(result => {
//     let matchAlbum;
//     matchAlbum =
//       result.result.albums.find(obj => obj.containedSong === matchAl.song) ||
//       result.result.albums.find(obj => obj.artist.name === matchAl.artist) ||
//       result.result.albums[0];
//     matchAlbum.rawName = matchAl.name;
//     matchAlbum.rawID = matchAl.id;
//     matchAlbum.matched = true;
//     matchAlbum.show = matchAl.show;
//     commit('updateAlbum', { ID: albumID, value: matchAlbum });
//   });
// }

// 字段有变化，需要更改搜索逻辑
// async function updateAlbum({ state, commit }, track) {
//   const matchAl = state.localMusic.albums.find(
//     al => al.id === track.al.id || al.rawID === track.al.id
//   );
//   if (matchAl.matched) {
//     track.al = matchAl;
//     return { code: 200 };
//   }
//   console.log('updateAlbum online');
//   const keyword = {
//     keywords: `${matchAl.song} ${matchAl.arForSearch}`,
//     type: 10,
//     limit: 16,
//   };
//   let result = await search(keyword).then(result1 => {
//     return result1;
//   });
//   if (result.code !== 200) {
//     return { code: result.code };
//   }
//   if (result.result.albumCount === 0) {
//     const keyword = {
//       keywords: `${matchAl.song}`,
//       type: 10,
//       limit: 5,
//     };
//     result = await search(keyword).then(result2 => {
//       return result2;
//     });
//   }
//   const matchAlbum =
//     result.result.albums.find(obj => obj.containedSong === matchAl.song) ||
//     result.result.albums.find(obj => obj.artist.name === matchAl.artist) ||
//     result.result.albums[0];
//   if (matchAlbum) {
//     matchAlbum.rawName = matchAl.name;
//     matchAlbum.rawID = matchAl.id;
//     matchAlbum.matched = true;
//     matchAlbum.show = matchAl.show;
//     commit('updateAlbum', { ID: matchAl.id, value: matchAlbum });
//     return { code: 200 };
//   }
// }

// 字段有变化，需要更改搜索逻辑
// async function updateArtists({ state, commit }, track) {
//   const arList = [];
//   for (const artist of track.ar) {
//     const matchAr = state.localMusic.artists.find(
//       obj => obj.name === artist.name
//     );
//     if (matchAr.matched) {
//       arList.push(matchAr);
//       return { code: 200 };
//     }
//     console.log('updateArtists online');
//     const keyword = {
//       keywords: matchAr.name,
//       type: 100,
//       limit: 16,
//     };
//     await search(keyword).then(result1 => {
//       if (result1.code !== 200) {
//         return { code: result1.code };
//       }
//       const matchAr = result1.result.artists.find(
//         obj => obj.name === artist.name
//       );
//       matchAr.rawID = artist.id;
//       matchAr.matched = true;
//       matchAr.show = artist.show;
//       commit('updateArtist', { ID: artist.id, value: matchAr });
//       arList.push(matchAr);
//     });
//   }
//   track.ar = arList;
//   return { code: 200 };
// }

// async function updateTrack({ state }, track) {
//   const matchTrack = state.localMusic.songs.find(
//     a => a.id === track.id || a.rawID === track.id
//   );
//   if (matchTrack.matched) {
//     return { code: 200 };
//   }
//   // const keyword = {
//   //   keywords: `${matchTrack.name} ${matchTrack.arForSearch}`,
//   //   type: 1,
//   //   limit: 16,
//   // };
//   // console.log(keyword);
//   // const result = await search(keyword).then(result => {
//   //   return result;
//   // });
//   // console.log('result =', result);
//   // console.log('track.duration = ', track.dt);
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

    const walk = async folder => {
      const files = fs.readdirSync(folder);
      files.forEach(async file => {
        const filePath = path.join(folder, file);
        const stats = fs.statSync(filePath);
        if (stats.isFile() && musicFileExtensions.test(filePath)) {
          const hasFilePath = state.localMusic.tracks.some(
            track => track.filePath === filePath
          );
          const trackID = await getTrack({ state, commit }, filePath);
          const albumID = await getAlbum({ state, commit }, filePath);
          const artistIDs = await getArtists({ state, commit }, filePath);
          if (!hasFilePath) {
            const song = {
              id: trackID,
              trackID: trackID,
              albumID: albumID,
              artistIDs: artistIDs,
            };
            commit('addSong', song);
          }
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

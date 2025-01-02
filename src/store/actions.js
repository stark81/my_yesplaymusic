import { isAccountLoggedIn, isLooseLoggedIn } from '@/utils/auth';
import { likeATrack } from '@/api/track';
import { getPlaylistDetail } from '@/api/playlist';
import { getTrackDetail } from '@/api/track';
import _ from 'lodash';
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
// import cloneDeep from 'lodash/cloneDeep';

const getPicUrl = (tracks, id) => {
  const track = tracks.find(item => item.id === id);
  if (!track) {
    return 'https://p1.music.126.net/jWE3OEZUlwdz0ARvyQ9wWw==/109951165474121408.jpg';
  }
  return track.matched ? track.al.picUrl : `atom://get-pic/${track.filePath}`;
};

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
  updateALocalTrack({ state, commit }, [filePath, newTrack]) {
    const tracks = state.localMusic.tracks;
    const localTrack = tracks.find(t => t.filePath === filePath);
    if (!localTrack) return;

    commit('updatePlaylistTracks', { oldTrack: localTrack, newTrack });
    commit('updateLocalTrackDetail', { oldTrack: localTrack, newTrack });
  },
  createLocalPlayList({ state, commit, dispatch }, params) {
    const tracks = state.localMusic.tracks;
    const imgTrack = tracks.find(t => t.id === params.imgID);
    const picUrl = imgTrack
      ? imgTrack.matched
        ? imgTrack.al.picUrl
        : `atom://get-pic/${imgTrack.filePath}`
      : 'https://p1.music.126.net/jWE3OEZUlwdz0ARvyQ9wWw==/109951165474121408.jpg';

    commit('addLocalPlaylist', {
      name: params.name,
      description: params.description,
      coverImgUrl: picUrl,
      updateTime: Date.now(),
      trackCount: params.trackCount || 0,
      trackIds: params.trackIds || [],
    });

    dispatch(
      'showToast',
      `${params.trackCount ? '创建并添加歌曲成功' : '创建歌单成功'}`
    );
  },
  addTrackToLocalPlaylist({ state, commit, dispatch }, params) {
    const playlist = state.localMusic.playlists.find(p => p.id === params.pid);
    if (!playlist) {
      dispatch('showToast', '歌单不存在');
      return;
    }
    const newIDs = _.difference(params.tracks, playlist.trackIds);
    if (newIDs.length === 0) {
      dispatch('showToast', '歌曲已存在');
      return;
    }

    const newPlaylist = {
      id: playlist.id,
      name: playlist.name,
      trackIds: [...playlist.trackIds, ...newIDs],
      trackCount: playlist.trackIds.length + newIDs.length,
      updateTime: Date.now(),
      coverImgUrl: getPicUrl(
        state.localMusic.tracks,
        newIDs[newIDs.length - 1]
      ),
    };
    commit('updateLocalPlaylist', newPlaylist);
    dispatch('showToast', `歌单新增 ${newIDs.length} 首歌`);
  },
  addOrRemoveTrackFromLocalPlaylist({ state, commit, dispatch }, params) {
    const playlist = state.localMusic.playlists.find(p => p.id === params.pid);
    if (!playlist) {
      dispatch('showToast', '歌单不存在');
      return;
    }
    let newLength = 0;
    let newTrackIds = [];
    if (params.op === 'del') {
      newTrackIds = _.difference(playlist.trackIds, params.tracks);
    } else if (params.op === 'add') {
      const addedTrackIds = _.difference(params.tracks, playlist.trackIds);
      if (addedTrackIds.length === 0) {
        dispatch('showToast', '歌曲已存在');
        return;
      }
      newTrackIds = [...playlist.trackIds, ...addedTrackIds];
      newLength = addedTrackIds.length;
    }
    const newPlaylist = {
      id: playlist.id,
      name: playlist.name,
      trackIds: newTrackIds,
      trackCount: newTrackIds.length,
      updateTime: Date.now(),
      coverImgUrl: getPicUrl(
        state.localMusic.tracks,
        newTrackIds[newTrackIds.length - 1]
      ),
    };
    commit('updateLocalPlaylist', newPlaylist);
    if (params.op === 'del') {
      dispatch('showToast', `删除成功`);
    } else if (params.op === 'add') {
      dispatch('showToast', `添加成功，共${newLength}首`);
    }
  },
  deleteLocalPlaylist({ state, commit, dispatch }, pid) {
    const playlist = state.localMusic.playlists.find(p => p.id === pid);
    if (!playlist) {
      dispatch('showToast', '歌单不存在');
      return;
    }
    commit('deleteLocalPlaylist', pid);
    dispatch('showToast', `删除歌单成功`);
  },
  accurateMatchTrack({ state, commit }, params) {
    const oldTrack = state.localMusic.tracks.find(t => t.id === params.id);
    getTrackDetail(params.title).then(data => {
      const newTrack = data.songs[0];
      commit('updatePlaylistTracks', { oldTrack, newTrack });
      commit('updateLocalTrackDetail', { oldTrack, newTrack });
    });
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

import store from '@/store';
import cloneDeep from 'lodash/cloneDeep';

export function localTrackParser(songID, replaceID = false) {
  const localMusic = store?.state.localMusic;
  const song = localMusic?.songs.find(s => s.id === songID);
  if (!song) return;
  const tr = localMusic.tracks.find(t => t.id === song.trackID);
  const al = localMusic.albums.find(a => a.id === song.albumID);
  const ar = localMusic.artists.filter(a => song.artistIDs.includes(a.id));

  const track = cloneDeep(tr);
  const album = al.matched ? al.onlineAlbum : al;
  let newAr = [];
  for (const a of ar) {
    if (a.matched) {
      newAr.push(a.onlineArtist);
    } else {
      newAr.push(a);
    }
  }

  track.picUrl = al.onlineAlbum?.picUrl || track.picUrl;
  track.al = album;
  track.ar = newAr;
  track.id = replaceID ? track.onlineTrack?.id || track.id : track.id;
  return track;
}

export function localAlbumParser(songID) {
  const localMusic = store.state.localMusic;
  const song = localMusic.songs.find(s => s.id === songID);
  if (!song) return;
  const al = localMusic.albums.find(a => a.id === song.albumID);
  const album = al.matched ? al.onlineAlbum : al;
  return album;
}

export function localArtistsParser(songID) {
  const localMusic = store.state.localMusic;
  const song = localMusic.songs.find(s => s.id === songID);
  if (!song) return;
  const ar = localMusic.artists.filter(a => song.artistIDs.includes(a.id));

  const newAr = [];
  for (const a of ar) {
    if (a.matched) {
      newAr.push(a.onlineArtist);
    } else {
      newAr.push(a);
    }
  }
  return newAr;
}

export function localTracksFilter(type, startID = 0, length = 'all') {
  const songs = store.state.localMusic.songs;
  const tracks = [];
  songs.every(item => {
    if (item.show && item.delete !== true && item.id >= startID) {
      const track = localTrackParser(item.id, false);
      tracks.push(track);
    }
    if (length !== 'all' && tracks.length >= parseInt(length)) return false;
    return true;
  });
  if (type === 'default') {
    return tracks.sort((a, b) => a.id - b.id);
  } else if (type === 'byname') {
    const newTracks = tracks.sort((a, b) => {
      return a['name'].localeCompare(b['name'], 'zh-CN', { numeric: true });
    });
    return newTracks;
  } else if (type === 'descend') {
    const trackList = tracks.sort((a, b) => {
      const timeA = new Date(a.createTime).getTime();
      const timeB = new Date(b.createTime).getTime();
      return timeB - timeA;
    });
    return trackList;
  } else if (type === 'ascend') {
    const trackList = tracks.sort((a, b) => {
      const timeA = new Date(a.createTime).getTime();
      const timeB = new Date(b.createTime).getTime();
      return timeA - timeB;
    });
    return trackList;
  }
}

const fs = require('fs');
const crypto = require('crypto');

export function importFromJson(origin) {
  return new Promise(resolve => {
    const result = {};
    if (!origin.version) {
      const playlists = v0Tov1Playlist(origin);
      result.playlists = playlists;
      v0Tov1Track(origin).then(tracks => {
        result.tracks = tracks;
        resolve(result);
      });
    } else if (origin.version === 'v1') {
      console.log();
    }
  });
}

export function createMD5(filePath) {
  const hash = crypto.createHash('md5');
  const data = fs.readFileSync(filePath);
  hash.update(data);
  return hash.digest('hex');
}

export function v0Tov1Track(origin) {
  return new Promise(resolve => {
    const result = [];
    const songs = origin.songs;
    for (const song of songs) {
      const track = origin.tracks.find(t => t.id === song.trackID);
      if (!track.matched) continue;
      const album = origin.albums.find(
        al => al.id === song.albumID
      ).onlineAlbum;
      const artists = origin.artists
        .filter(ar => song.artistIDs.includes(ar.id))
        .map(ar => ar.onlineArtist || ar);
      track.picUrl = album.picUrl;
      track.show = song.show;
      track.delete = song.delete;
      track.md5 = createMD5(track.filePath);
      track.alia = track.onlineTrack.alias;
      track.al = album;
      track.ar = artists;
      track.id = track.onlineTrack.id;
      delete track.arForSearch;
      delete track.hasUpdateTime;
      delete track.onlineTrack;
      result.push(track);
    }
    return resolve(result);
  });
}

function v0Tov1Playlist(origin) {
  const result = [];
  const playlists = origin.playlists;
  if (playlists.length === 0) return;

  for (const playlist of playlists) {
    const trackIds = playlist.trackIds.map(id => {
      return origin.tracks.find(t => t.id === id)?.onlineTrack.id ?? id;
    });
    playlist.trackIds = trackIds;
    result.push(playlist);
  }
  return result;
}

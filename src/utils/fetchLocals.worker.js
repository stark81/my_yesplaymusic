// worker.worker.js

// 监听主线程发送的消息
self.addEventListener('message', event => {
  const { type, data } = event.data;
  if (type === 'fetchLocalData') {
    handleEvent(data);
  }
});

const handleEvent = localMusic => {
  const songs = localMusic.songs.filter(s => s.show && s.delete !== true);
  const addTracks = [];
  const addAlbums = [];
  const addedArtists = [];
  for (const song of songs) {
    const track = localMusic.tracks.find(t => t.id === song.trackID);
    const al = localMusic.albums.find(a => a.id === song.albumID);
    const ar = localMusic.artists.filter(a => song.artistIDs.includes(a.id));

    const artists = [];
    for (const a of ar) {
      let ar = null;
      if (a.matched) {
        ar = a.onlineArtist;
      } else {
        ar = a;
      }
      artists.push(ar);
      if (!addedArtists.some(art => art.id === ar.id)) {
        addedArtists.push(ar);
      }
    }

    let album = null;
    if (al.matched) {
      album = al.onlineAlbum;
      track.picUrl = al.onlineAlbum.picUrl;
    } else {
      album = al;
    }
    track.al = album;
    track.ar = artists;
    addTracks.push(track);
    const alExist = addAlbums.find(al => al.id === album.id);
    if (!alExist) {
      addAlbums.push(album);
    }
  }

  self.postMessage({
    type: 'updateLocalsXXX',
    tracks: addTracks,
    albums: [...new Set(addAlbums)],
    artists: [...new Set(addedArtists)],
  });
};

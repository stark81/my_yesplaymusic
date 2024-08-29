function getLyricsFromMetadata(metadata) {
  const { common, format, native } = metadata;
  let lyrics = '';
  if (common.lyrics) {
    // 这种一般是iTunes的歌词
    lyrics = common.lyrics.length ? common.lyrics[0] : '';
  } else {
    for (const tag of format.tagTypes || []) {
      if (tag === 'vorbis') {
        // flac
        lyrics = native.vorbis.find(item => item.id === 'LYRICS').value || '';
        break;
      } else if (tag === 'ID3v2.3') {
        lyrics =
          native['ID3v2.3'].find(item => item.id === 'USLT').value.text || '';
        break;
      } else if (tag === 'ID3v2.4') {
        lyrics =
          native['ID3v2.4'].find(item => item.id === 'USLT').value.text || '';
        break;
      }
    }
  }
  return lyrics;
}

export function getLyrics(metadata) {
  let result = {
    lrc: { lyric: [] },
    tlyric: { lyric: [] },
    romalrc: { lyric: [] },
  };
  const lyrics = getLyricsFromMetadata(metadata);

  if (lyrics) {
    const splitLines = str => {
      if (str.includes('\r\n')) {
        return str.split('\r\n');
      } else if (str.includes('\r')) {
        return str.split('\r');
      } else {
        return str.split('\n');
      }
    };
    const lyricsLines = splitLines(lyrics);
    const groupedResult = lyricsLines.reduce(
      (acc, curr) => {
        if (curr === '') {
          acc.push([]);
          acc[acc.length - 1].push(curr);
        } else {
          acc[acc.length - 1].push(curr);
        }
        return acc;
      },
      [[]]
    );
    const lyricArray = groupedResult.filter(item => item.length > 1);

    if (lyricArray.length) {
      result = {
        lrc: { lyric: lyricArray[0] || [] },
        tlyric: { lyric: lyricArray[1] || [] },
        romalrc: { lyric: lyricArray[2] || [] },
      };
    }
  }
  return result;
}

function getLyricsFromMetadata(metadata) {
  const { common, format, native } = metadata;
  let lyrics = '';
  if (common.lyrics) {
    // 这种一般是iTunes的歌词
    if (typeof common.lyrics[0] === 'string') {
      lyrics = common.lyrics[0];
    } else if (typeof common.lyrics[0] === 'object') {
      lyrics = common.lyrics[0].syncText
        ? common.lyrics[0].syncText[0].text
        : common.lyrics[0].text || '';
    }
  } else {
    for (const tag of format.tagTypes || []) {
      if (tag === 'vorbis') {
        const vorbis = native.vorbis.find(item => item.id === 'LYRICS');
        lyrics = vorbis ? vorbis.value : '';
        break;
      } else if (tag === 'ID3v2.3') {
        const id3v2 = native['ID3v2.3'].find(item => item.id === 'USLT');
        lyrics = id3v2 && id3v2.value ? id3v2.value.text : '';
        break;
      } else if (tag === 'ID3v2.4') {
        const id3v2 = native['ID3v2.4'].find(item => item.id === 'USLT');
        lyrics = id3v2 && id3v2.value ? id3v2.value.text : '';
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

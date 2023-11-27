const { TouchBar, nativeImage, ipcMain } = require('electron');
const { TouchBarButton, TouchBarSpacer } = TouchBar;
const path = require('path');

export function createTouchBar(window) {
  const renderer = window.webContents;
  let lyrics;

  // Icon follow touchbar design guideline.
  // See: https://developer.apple.com/design/human-interface-guidelines/macos/touch-bar/touch-bar-icons-and-images/
  // Icon Resource: https://devimages-cdn.apple.com/design/resources/
  function getNativeIcon(name) {
    return nativeImage.createFromPath(
      // eslint-disable-next-line no-undef
      path.join(__static, 'img/touchbar/', name)
    );
  }

  const playButton = new TouchBarButton({
    click: () => {
      renderer.send('play');
    },
    icon: getNativeIcon('play.png'),
  });

  const previousTrackButton = new TouchBarButton({
    click: () => {
      renderer.send('previous');
    },
    icon: getNativeIcon('backward.png'),
  });

  const nextTrackButton = new TouchBarButton({
    click: () => {
      renderer.send('next');
    },
    icon: getNativeIcon('forward.png'),
  });

  const likeButton = new TouchBarButton({
    click: () => {
      renderer.send('like');
    },
    icon: getNativeIcon('like.png'),
  });

  const showLyric = new TouchBarButton({
    label: '听你想听的音乐',
  });

  ipcMain.on('player', (e, { playing, likedCurrentTrack }) => {
    playButton.icon =
      playing === true ? getNativeIcon('pause.png') : getNativeIcon('play.png');
    likeButton.icon = likedCurrentTrack
      ? getNativeIcon('like_fill.png')
      : getNativeIcon('like.png');
  });

  ipcMain.on('sendLyrics', (e, arg) => {
    lyrics = arg[0];
  });

  ipcMain.on('lyricIndex', (_, index) => {
    showLyric.label = lyrics[index + 1].content;
  });

  const touchBar = new TouchBar({
    items: [
      previousTrackButton,
      playButton,
      nextTrackButton,
      likeButton,
      new TouchBarSpacer({ size: 'small' }),
      showLyric,
    ],
  });
  return touchBar;
}

const { TouchBar, nativeImage, ipcMain } = require('electron');
const { TouchBarButton, TouchBarSpacer } = TouchBar;
const path = require('path');

export function createTouchBar(window) {
  const renderer = window.webContents;

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

  const fmTrashButton = new TouchBarButton({
    click: () => {
      renderer.send('fm-trash');
    },
    icon: getNativeIcon('thumbs_down.png'),
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

  // const showLyric = new TouchBarButton({
  //   label: '听你想听的音乐',
  // });

  const barLyric = () => {
    const showLyric = new TouchBarButton({ icon: nativeImage.createEmpty() });
    global.setBarLyric = function (img, width, height) {
      const Image = nativeImage
        .createFromDataURL(img)
        .resize({ width, height });
      Image.setTemplateImage(true);
      showLyric.icon = Image;
    };
    return showLyric;
  };

  ipcMain.on('player', (e, { playing, likedCurrentTrack, isPersionalFM }) => {
    playButton.icon =
      playing === true ? getNativeIcon('pause.png') : getNativeIcon('play.png');
    likeButton.icon = likedCurrentTrack
      ? getNativeIcon('like_fill.png')
      : getNativeIcon('like.png');
    options.items[0] = isPersionalFM ? fmTrashButton : previousTrackButton;
    const touch = new TouchBar(options);
    window.setTouchBar(touch);
  });

  const options = {
    items: [
      previousTrackButton,
      playButton,
      nextTrackButton,
      likeButton,
      new TouchBarSpacer({ size: 'flexible' }),
      barLyric(),
      // new TouchBarSpacer({ size: 'flexible' }),
    ],
  };

  var touchBar = new TouchBar(options);
  if (touchBar) window.setTouchBar(touchBar);
}

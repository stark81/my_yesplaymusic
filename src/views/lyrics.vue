<template>
  <transition name="slide-fade">
    <div
      v-show="!noLyric"
      ref="lyricsContainer"
      class="lyrics-container"
      :style="lyricFontSize"
    >
      <div id="line-1" class="line"></div>
      <div
        v-for="(line, index) in lyricWithTranslation"
        :id="`line${index}`"
        :key="index"
        class="line"
        :class="{
          highlight: currentLyricIndex === index,
        }"
        @click="clickLyricLine(line.time)"
        @dblclick="clickLyricLine(line.time, true)"
      >
        <div class="content">
          <span v-if="line.contents[0]">{{ line.contents[0] }}</span>
          <br />
          <span
            v-if="showTranslation === 'tlyric' && line.contents[1]"
            class="translation"
            >{{ line.contents[1] }}</span
          >
          <span
            v-if="showTranslation === 'rlyric' && line.contents[2]"
            class="translation"
          >
            {{ line.contents[2] }}</span
          >
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
// The lyrics page of Apple Music is so gorgeous, so I copy the design.
// Some of the codes are from https://github.com/sl1673495/vue-netease-music

import { mapState, mapMutations } from 'vuex';
import { formatTrackTime } from '@/utils/common';
import { isMac } from '@/utils/platform';

export default {
  name: 'Lyrics',
  data() {
    return {
      lyricsInterval: null,
      minimize: true,
      background: '',
      date: this.formatTime(new Date()),
    };
  },
  computed: {
    ...mapState([
      'player',
      'settings',
      'showLyrics',
      'modals',
      'extensionStatus',
    ]),
    currentTrack() {
      return this.player.currentTrack;
    },
    lyric() {
      return this.player.lyrics.lyric;
    },
    tlyric() {
      return this.player.lyrics.tlyric;
    },
    rlyric() {
      return this.player.lyrics.rlyric;
    },
    currentLyricIndex() {
      return this.player.currentLyricIndex;
    },
    currentLyric() {
      return this.lyric[this.currentLyricIndex];
    },
    showTranslation() {
      return this.settings.showLyricsTranslation;
    },
    onlineTrackDelay() {
      return this.modals.setLyricDelayModal.delayTime || 0;
    },
    lyricDelay() {
      return this.isLocal
        ? this.currentTrack.lyricDelay
        : this.onlineTrackDelay;
    },
    isLocal() {
      return this.player.currentTrack.isLocal || false;
    },
    lyricWithTranslation() {
      let ret = [];
      // 空内容的去除
      const lyricFiltered = this.lyric.filter(({ content }) =>
        Boolean(content)
      );
      // content统一转换数组形式
      if (lyricFiltered.length) {
        lyricFiltered.forEach(l => {
          const { rawTime, time, content } = l;
          const lyricItem = { time, content, contents: [content] };
          // 歌词翻译
          const sameTimeTLyric = this.tlyric.find(
            ({ rawTime: tLyricRawTime }) => tLyricRawTime === rawTime
          );
          if (sameTimeTLyric) {
            const { content: tLyricContent } = sameTimeTLyric;
            if (content) {
              lyricItem.contents.push(tLyricContent);
            } else {
              lyricItem.contents.push(null);
            }
          } else {
            lyricItem.contents.push(null);
          }
          // 歌词音译
          const sameTimeRLyric = this.rlyric.find(
            ({ rawTime: rLyricRawTime }) => rLyricRawTime === rawTime
          );
          if (sameTimeRLyric) {
            const { content: rLyricContent } = sameTimeRLyric;
            if (content) {
              lyricItem.contents.push(rLyricContent);
            } else {
              lyricItem.contents.push(null);
            }
          }
          ret.push(lyricItem);
        });
      } else {
        ret = lyricFiltered.map(({ time, content }) => ({
          time,
          content,
          contents: [content],
        }));
      }
      return ret;
    },
    lyricFontSize() {
      return {
        fontSize: `${this.$store.state.settings.lyricFontSize || 28}px`,
      };
    },
    noLyric() {
      return this.lyric.length == 0;
    },
    osdLyric() {
      return this.settings.showOsdLyric;
    },
    showOsdLyric() {
      return this.settings.showOsdLyric;
    },
    dbusStatus() {
      return this.extensionStatus;
    },
    sendDBusLrc() {
      return this.settings.sendLyricToDBus || false;
    },
    isLyricPage() {
      return this.showLyrics && this.$parent.show === 'lyric';
    },
  },
  watch: {
    lyricDelay(val) {
      clearInterval(this.lyricsInterval);
      if (this.isLocal) {
        const track = this.$store.state.localMusic.tracks.find(
          t => t.filePath === this.currentTrack.filePath
        );
        track.lyricDelay = val;
      }
    },
    showLyrics(show) {
      if (show) {
        this.$store.commit('enableScrolling', false);
      } else {
        this.$store.commit('enableScrolling', true);
      }
    },
    lyric(value) {
      if (this.showOsdLyric || isMac) {
        const { ipcRenderer } = require('electron');
        ipcRenderer.send('sendLyrics', [value, this.tlyric]);
      }
    },
    currentLyricIndex(value) {
      if (this.showOsdLyric || isMac) {
        const { ipcRenderer } = require('electron');
        ipcRenderer.send('lyricIndex', value);
      }
      const el = document.getElementById(`line${value}`);
      if (el) {
        el.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    },
    currentLyric(value) {
      if (this.dbusStatus && this.sendDBusLrc) {
        const { ipcRenderer } = require('electron');
        let result = {};
        if (this.currentLyricIndex < this.lyric.length) {
          const nextLyric = this.lyric[this.currentLyricIndex + 1];
          const diff = nextLyric?.time - value?.time || 10;
          result = {
            content:
              value?.content || this.currentTrack?.name || '听你想听的音乐',
            time: diff,
          };
        } else {
          result = {
            content: this.currentTrack?.name || '听你想听的音乐',
            time: 10,
          };
        }
        ipcRenderer.send('updateCurrentLyric', result);
      }
    },
    tlyric(val) {
      this.$parent.hasTLyric = val.length > 0;
    },
    rlyric(val) {
      this.$parent.hasRLyric = val.length > 0;
    },
    osdLyric(val) {
      if (val) {
        const { ipcRenderer } = require('electron');
        setTimeout(() => {
          ipcRenderer.send('lyricIndex', this.currentLyricIndex);
        }, 1000);
      }
    },
    isLyricPage(val) {
      if (val) {
        const el = document.getElementById(`line${this.currentLyricIndex}`);
        if (el) {
          el.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }
      }
    },
    sendDBusLrc(value) {
      const { ipcRenderer } = require('electron');
      if (!value) {
        ipcRenderer.send('updateCurrentLyric', {
          content: '',
          time: 10,
        });
      } else {
        ipcRenderer.send('updateCurrentLyric', {
          content: this.currentTrack?.name || '听你想听的音乐',
          time: 10,
        });
      }
    },
  },
  created() {
    this.initDate();
  },
  methods: {
    ...mapMutations(['toggleLyrics']),
    initDate() {
      var _this = this;
      clearInterval(this.timer);
      this.timer = setInterval(function () {
        _this.date = _this.formatTime(new Date());
      }, 1000);
    },
    formatTime(value) {
      let hour = value.getHours().toString();
      let minute = value.getMinutes().toString();
      let second = value.getSeconds().toString();
      return (
        hour.padStart(2, '0') +
        ':' +
        minute.padStart(2, '0') +
        ':' +
        second.padStart(2, '0')
      );
    },
    async getInnerLyric(filePath) {
      const data = await fetch(`atom://get-lyric/${filePath}`).then(res =>
        res.json()
      );
      return data;
    },
    formatTrackTime(value) {
      return formatTrackTime(value);
    },
    clickLyricLine(value, startPlay = false) {
      // TODO: 双击选择还会选中文字，考虑搞个右键菜单复制歌词
      let jumpFlag = false;
      this.lyric.filter(function (item) {
        if (item.content == '纯音乐，请欣赏') {
          jumpFlag = true;
        }
      });
      if (window.getSelection().toString().length === 0 && !jumpFlag) {
        this.player.seek(value);
      }
      if (startPlay === true) {
        this.player.play();
      }
    },
  },
};
</script>

<style lang="scss" scoped>
@keyframes rotate {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.lyrics-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow-y: scroll;
  font-weight: 600;
  padding-left: 4vh;
  overflow-y: auto;
  transition: 0.5s;
  scrollbar-width: none; // firefox

  .line {
    width: 40vw;
    margin: 2px 0;
    padding: 12px;
    transition: 0.5s;
    border-radius: 12px;

    &:hover {
      background: var(--color-secondary-bg-for-transparent);
    }

    .content {
      transform-origin: center left;
      transform: scale(0.95);
      transition: all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);

      span {
        opacity: 0.28;
        cursor: default;
        font-size: 1em;
        transition: all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      }

      span.translation {
        opacity: 0.2;
        font-size: 0.925em;
      }
    }
  }

  .line#line-1:hover {
    background: unset;
  }

  .translation {
    margin-top: 0.1em;
  }

  .highlight div.content {
    // transform: scale(1);
    span {
      opacity: 0.98;
      display: inline-block;
    }

    span.translation {
      opacity: 0.65;
    }
  }
}

::-webkit-scrollbar {
  display: none;
}

.lyrics-container .line:first-child {
  margin-top: 50vh;
}

.lyrics-container .line:last-child {
  margin-bottom: calc(50vh - 128px);
}

@media screen and (min-width: 1200px) {
  .right-side .lyrics-container {
    max-width: 600px;
  }
}

.slide-fade-enter-active {
  transition: all 0.5s ease;
}

.slide-fade-leave-active {
  transition: all 0.5s cubic-bezier(0.2, 0.2, 0, 1);
}

.slide-fade-enter,
.slide-fade-leave-to {
  transform: translateX(27vh);
  opacity: 0;
}
</style>

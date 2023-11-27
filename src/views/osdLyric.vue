<template>
  <div class="lyrics-container">
    <div id="line-1" class="line"></div>
    <div
      v-for="(line, index) in lyricWithTranslation"
      :id="`line${index}`"
      :key="index"
      class="line"
      :class="{ highlight: highlightLyricIndex === index }"
    >
      <div class="content">
        <span v-if="line.contents[0]">{{ line.contents[0] }}</span>
        <br />
        <span v-if="line.contents[1]" class="translation">{{
          line.contents[1]
        }}</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'OsdLyric',
  data() {
    return {
      lyric: [],
      tlyric: [],
      highlightLyricIndex: -1,
    };
  },
  computed: {
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
  },
  watch: {
    highlightLyricIndex(val) {
      const el = document.getElementById(`line${val}`);
      if (el) {
        el.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    },
  },
  mounted() {
    const { ipcRenderer } = require('electron');
    ipcRenderer.invoke('onloadLyric').then(arg => {
      arg[0].shift();
      this.lyric = arg[0];
      this.tlyric = arg[1];
      console.log('this.tlyric = ', this.tlyric);
    });
    ipcRenderer.on('index', (_, idx) => {
      this.highlightLyricIndex = idx;
    });
    ipcRenderer.on('lyric', (_, arg) => {
      arg[0].shift();
      this.lyric = arg[0];
      this.tlyric = arg[1];
      console.log('this.tlyric = ', this.tlyric);
    });
  },
};
</script>
<style lang="scss">
body {
  background-color: rgba(0, 0, 0, 0.15);
  user-select: none;
  -webkit-app-region: drag;
}
.lyrics-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  transition: 0.5s;
  scrollbar-width: none;

  .line {
    margin: 2px 0;
    padding: 2px 18px;
    transition: 0.5s;
    border-radius: 12px;
    color: white;
    text-shadow: 2px 2px 2px rgba(0, 0, 0, 0.5);
    font-weight: bold;
    text-align: center;

    .content {
      transform-origin: center left;
      transform: scale(0.95);
      transition: all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);

      span {
        opacity: 0.58;
        cursor: default;
        font-size: 26px;
        transition: all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      }

      span.translation {
        opacity: 0.5;
        font-size: 24px;
      }
    }
  }

  .highlight div.content {
    span {
      opacity: 0.98;
      display: inline-block;
    }

    span.translation {
      opacity: 0.8;
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
</style>

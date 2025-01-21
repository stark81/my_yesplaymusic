<template>
  <div
    class="container"
    :style="{ overflowY: type === 'normal' ? 'scroll' : 'hidden' }"
  >
    <div
      class="line"
      :style="{ paddingTop: type === 'normal' ? '45vh' : '0px' }"
    ></div>
    <div
      v-for="(line, index) in lyricWithTranslation"
      :id="`line${index}`"
      :key="index"
      class="line"
      :class="{ highlight: index === highlighIndex }"
      :style="lineStyle(index)"
    >
      <div class="content">
        <span v-if="line.contents[0]" :style="spanStyle">{{
          line.contents[0]
        }}</span>
        <br />
        <span v-if="line.contents[1]" :style="spanStyle">{{
          line.contents[1]
        }}</span>
      </div>
    </div>
    <div
      class="line"
      :style="{ paddingBottom: type === 'normal' ? '45vh' : '6px' }"
    ></div>
  </div>
</template>

<script>
import { mapState } from 'vuex';
export default {
  name: 'LyricMain',
  props: {
    lrc: {
      type: Array,
      default: () => [],
    },
    tlrc: {
      type: Array,
      default: () => [],
    },
    idx: {
      type: Number,
      default: 0,
    },
  },
  data() {
    return {
      lyric: [],
      tlyric: [],
      highlighIdx: 0,
    };
  },
  computed: {
    ...mapState(['osd']),
    lyricWithTranslation() {
      let ret = [];
      const lyricFiltered = this.lyric.filter(({ content }) =>
        Boolean(content)
      );

      if (lyricFiltered.length) {
        lyricFiltered.forEach(l => {
          const { rawTime, time, content } = l;
          const lyricItem = { time, content, contents: [content] };
          const sameTimeLyric = this.tlyric.find(
            ({ rawTime: tLyricRawTime }) => tLyricRawTime === rawTime
          );
          if (sameTimeLyric) {
            const { content: tLyricContent } = sameTimeLyric;
            if (content) {
              lyricItem.contents.push(tLyricContent);
            } else {
              lyricItem.contents.push(null);
            }
          } else {
            lyricItem.contents.push(null);
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
      const hasTranslation = ret[this.highlighIdx]?.contents[1];
      const idx = hasTranslation
        ? this.highlighIdx
        : this.highlighIdx + (this.highlighIdx % 2 === 0 ? 0 : -1);
      return this.type === 'normal'
        ? ret
        : ret.slice(idx, idx + (hasTranslation ? 1 : 2));
    },
    fontColor() {
      return this.osd.fontColor;
    },
    spanStyle() {
      return {
        textShadow: `2px 2px 2px ${
          this.fontColor === 'black'
            ? 'rgba(210, 210, 210, 0.2)'
            : 'rgba(0, 0, 0, 0.2)'
        }`,
      };
    },
    type() {
      return this.osd.type;
    },
    highlighIndex() {
      const idx =
        this.lyricWithTranslation.length === 1 ? 0 : this.highlighIdx % 2;
      return this.type === 'normal' ? this.highlighIdx : idx;
    },
  },
  created() {
    this.lyric = this.lrc;
    this.tlyric = this.tlrc;
    this.highlighIdx = this.idx;
    this.init();
    setTimeout(() => {
      const el = document.getElementById(`line${this.highlighIdx}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  },
  methods: {
    init() {
      const ipcRenderer = window.require('electron').ipcRenderer;
      ipcRenderer.on('lyric', (_, arg) => {
        this.lyric = arg[0];
        this.tlyric = arg[1];
      });
      ipcRenderer.on('index', (_, idx) => {
        this.highlighIdx = idx;
        const el = document.getElementById(`line${idx}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    },
    lineStyle(idx) {
      const result = {};
      const clorMap = {
        black: '#222',
        white: '#eee',
        blue: '#335eea',
        green: '#37cf88',
        red: 'red',
      };
      result.color = clorMap[this.fontColor];
      let align = 'center';
      if (
        this.type === 'small' &&
        !this.lyricWithTranslation[idx]?.contents[1]
      ) {
        align = idx === 0 ? 'start' : 'end';
      }
      result.textAlign = align;
      return result;
    },
  },
};
</script>

<style lang="scss" scoped>
.container {
  overflow-y: scroll;
  scroll-behavior: auto;
  scrollbar-width: thin;
}
.container::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.line {
  margin: 8px 0;
  padding: 2px 18px;
  transition: 0.5s;
  font-weight: bold;
  width: 100vw;

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
.highlight .content span {
  opacity: 0.98;
  display: inline-block;
}
.highlight .content span.translation {
  opacity: 0.8;
}
</style>

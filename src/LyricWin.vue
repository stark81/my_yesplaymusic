<template>
  <div id="lyricRoot" :class="{ 'is-lock': isLock }">
    <OsdHeader
      v-show="!isLock"
      class="header"
      :class="{ lock: isLock }"
      :playing-status="playing"
    />
    <div v-show="isLock" class="control-lock">
      <button-icon
        v-if="!isLinux"
        id="osd-lock"
        class="btn"
        :style="lockStyle"
        @click.native="handleLock"
        ><SvgIcon
          icon-class="lock"
          style="margin-right: 4px"
        />解锁</button-icon
      ></div
    >
    <LyricMain class="main" :lrc="lyric" :tlrc="tlyric" :idx="highlighIdx" />
    <div v-show="showMenu" ref="menu" class="menu" @click="closeMenu">
      <div class="item" @click="handleClick('white')">典雅白</div>
      <div class="item" @click="handleClick('black')">高级黑</div>
      <div class="item" @click="handleClick('blue')">深邃蓝</div>
      <div class="item" @click="handleClick('green')">清新绿</div>
      <div class="item" @click="handleClick('red')">活力红</div>
    </div>
  </div>
</template>

<script>
import { mapState, mapMutations } from 'vuex';
import OsdHeader from './components/OsdHeader.vue';
import LyricMain from './components/LyricMain.vue';
import ButtonIcon from '@/components/ButtonIcon.vue';

export default {
  name: 'LyricWin',
  components: {
    OsdHeader,
    LyricMain,
    ButtonIcon,
  },
  data() {
    return {
      showMenu: false,
      topValue: 0,
      leftValue: 0,
      lyric: [],
      tlyric: [],
      highlighIdx: 0,
      playing: false,
    };
  },
  computed: {
    ...mapState(['osd']),
    fontColor() {
      return this.osd.fontColor;
    },
    isLock() {
      return this.osd.isLock;
    },
    type() {
      return this.osd.type;
    },
    isLinux() {
      return process.platform === 'linux';
    },
    lockStyle() {
      const textColor = this.fontColor === 'white' ? '#222' : 'white';
      return { color: textColor, backgroundColor: this.fontColor };
    },
  },
  created() {
    const player = JSON.parse(localStorage.getItem('player') || '{}');
    if (!player._lyrics) return;
    this.lyric = player._lyrics.lyric || [];
    this.tlyric = player._lyrics.tlyric || [];
    this.highlighIdx = player._currentLyricIndex || 0;
    this.playing = player._playing;
  },
  methods: {
    ...mapMutations(['updateSettings']),
    openMenu(e) {
      this.showMenu = true;
      this.$nextTick(
        function () {
          this.$refs.menu.focus();
        }.bind(this)
      );
      e.preventDefault();
    },
    closeMenu() {
      this.showMenu = false;
    },
    handleClick(value) {
      this.updateSettings({ key: 'fontColor', value });
    },
    handleLock() {
      this.updateSettings({ key: 'isLock', value: false });
      const ipcRenderer = require('electron').ipcRenderer;
      ipcRenderer.send('set-osd-window', { isLock: false });
    },
  },
};
</script>

<style lang="scss" scoped>
#lyricRoot {
  color: #fff;
  font-size: 20px;
  scrollbar-width: none;
  overflow-y: hidden;
  transition: background 0.3s;

  &:hover {
    background: rgba(0, 0, 0, 0.2);
  }
  &.is-lock:hover {
    background: rgba(0, 0, 0, 0);
  }
}

.header {
  height: 40px;
  width: 100vw;
  opacity: 0;
  -webkit-app-region: drag;
  transition: opacity 0.3s;
}

.header.lock {
  opacity: 0 !important;
}

.control-lock {
  width: 100%;
  height: 38px;
  z-index: 1;
  display: flex;
  // height: 40px;
  justify-content: center;
  align-items: center;
}

.btn {
  display: flex;
  padding: 4px 10px;
  cursor: pointer;
  border: none;
  outline: none;
  background: none;
  // color: white;
  // background-color: var(--color-bg);
  border-radius: 4px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.main {
  height: calc(100vh - 40px);
}

.menu {
  position: fixed;
  list-style: none;
  width: 90%;
  top: 34px;
  left: 50%;
  transform: translate(-50%, 0);
  background: rgba(40, 40, 40, 0.8);
  box-shadow: 0 6px 12px -4px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.06);
  backdrop-filter: blur(12px);
  border-radius: 6px;
  box-sizing: border-box;
  padding: 6px;
  -webkit-app-region: no-drag;
  z-index: 110;
  display: flex;
  justify-content: center;
  transition: background 125ms ease-out, opacity 125ms ease-out,
    transform 125ms ease-out;

  &:focus {
    outline: none;
  }
}

.menu .item {
  font-weight: 600;
  font-size: 14px;
  padding: 10px 14px;
  border-radius: 8px;
  cursor: default;
  display: flex;
  align-items: center;
  &:hover {
    color: #335eea;
    background: rgba(189, 207, 255, 0.28);
    transition: opacity 125ms ease-out, transform 125ms ease-out;
  }
}
</style>

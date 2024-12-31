<template>
  <div class="header-container">
    <button-icon class="btn" @click.native="showMain"
      ><svg-icon icon-class="logo"
    /></button-icon>
    <button-icon class="btn" @click.native="playPrev"
      ><svg-icon icon-class="previous"
    /></button-icon>
    <button-icon class="btn" @click.native="playOrPause"
      ><svg-icon :icon-class="isPlaying ? 'pause' : 'play'"
    /></button-icon>
    <button-icon class="btn" @click.native="playNext"
      ><svg-icon icon-class="next"
    /></button-icon>
    <button-icon class="btn" @click.native="openMenu"
      ><svg-icon icon-class="color-plate" style="transform: scale(1.1)"
    /></button-icon>
    <button-icon class="btn" @click.native="switchMode"
      ><svg-icon
        :icon-class="type === 'small' ? 'normal-mode' : 'mini-mode'"
        style="transform: scale(0.9)"
    /></button-icon>
    <button-icon class="btn" @click.native="handleLock"
      ><svg-icon icon-class="lock"
    /></button-icon>
    <button-icon class="btn" @click.native="handleClose"
      ><svg-icon icon-class="x" style="transform: scale(1.3)"
    /></button-icon>
  </div>
</template>

<script>
import { mapState, mapMutations } from 'vuex';
import ButtonIcon from '@/components/ButtonIcon.vue';

const ipcRenderer = require('electron').ipcRenderer;

export default {
  name: 'OsdHeader',
  components: {
    ButtonIcon,
  },
  props: {
    playingStatus: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      isPlaying: false,
    };
  },
  computed: {
    ...mapState(['osd']),
    type() {
      return this.osd.type;
    },
    isLock() {
      return this.osd.isLock;
    },
    fontColor() {
      return this.osd.fontColor;
    },
  },
  created() {
    this.isPlaying = this.playingStatus;
    ipcRenderer.on('update-osd-playing-status', (_, status) => {
      this.isPlaying = status;
    });
    ipcRenderer.send('set-osd-window', { isLock: this.isLock });
  },
  methods: {
    ...mapMutations(['updateSettings']),
    showMain() {
      ipcRenderer.send('from-osd', 'showMainWin');
    },
    playPrev() {
      ipcRenderer.send('from-osd', 'playPrev');
    },
    playOrPause() {
      ipcRenderer.send('from-osd', 'playOrPause');
    },
    playNext() {
      ipcRenderer.send('from-osd', 'playNext');
    },
    openMenu(e) {
      this.$parent.openMenu(e);
    },
    switchMode() {
      const type = this.type === 'small' ? 'normal' : 'small';
      this.updateSettings({ key: 'type', value: type });
      ipcRenderer.send('set-osd-window', { type });
    },
    handleLock() {
      ipcRenderer.send('set-osd-window', { isLock: !this.isLock });
      this.updateSettings({ key: 'isLock', value: !this.isLock });
    },
    handleClose() {
      ipcRenderer.send('set-osd-window', { show: false });
    },
  },
};
</script>

<style scoped lang="scss">
.header-container {
  display: flex;
  padding-top: 4px;
  flex-flow: row wrap;
  align-items: center;
  justify-content: center;
}
.btn {
  // padding: 0 10px;
  cursor: pointer;
  border: none;
  outline: none;
  background: none;
  color: #fff;
  transition: opacity 0.3s ease;
  -webkit-app-region: no-drag;
  .svg-icon {
    width: 16px;
    height: 16px;
  }
}
</style>

<template>
  <Modal
    class="set-delay-time-modal"
    :show="show"
    :close="close"
    title="调整歌词进度"
    width="25vw"
  >
    <template slot="default">
      <div class="content">
        <div class="item" @click="operation('delay')">👆0.5秒</div>
        <div class="item" @click="operation('reset')">重置</div>
        <div class="item" @click="operation('ahead')">👇 0.5秒</div>
      </div>
    </template>
    <template slot="footer">
      <div>当前状态：{{ currentStatus() }}</div>
    </template>
  </Modal>
</template>

<script>
import Modal from '@/components/Modal.vue';
// import locale from '@/locale';
import { mapMutations, mapState, mapActions } from 'vuex';
// import { createPlaylist, addOrRemoveTrackFromPlaylist } from '@/api/playlist';

export default {
  name: 'ModalSetLyricDelay',
  components: {
    Modal,
  },
  computed: {
    ...mapState(['modals']),
    delay: {
      get() {
        return this.filePath
          ? this.$store.state.localMusic.tracks.find(
              t => t.filePath === this.filePath
            ).lyricDelay
          : 0;
      },
      set(value) {
        const track = this.$store.state.localMusic.tracks.find(
          t => t.filePath === this.filePath
        );
        track.lyricDelay = value;
      },
    },
    show: {
      get() {
        return this.modals.setLyricDelayModal.show;
      },
      set(value) {
        this.updateModal({
          modalName: 'setLyricDelayModal',
          key: 'show',
          value,
        });
      },
    },
    filePath: {
      get() {
        return this.modals.setLyricDelayModal.filePath;
      },
      set(value) {
        this.updateModal({
          modalName: 'setLyricDelayModal',
          key: 'filePath',
          value,
        });
      },
    },
  },
  methods: {
    ...mapMutations(['updateModal', 'updateData', 'setDelayTime']),
    ...mapActions(['showToast']),
    close() {
      this.show = false;
    },
    currentStatus() {
      if (this.delay === 0) {
        return '未调整';
      } else if (this.delay < 0) {
        return `延后(👆)了 ${-this.delay} 秒`;
      } else {
        return `提前(👇)了 ${this.delay} 秒`;
      }
    },
    operation(op) {
      if (op === 'delay') {
        this.delay -= 0.5;
      } else if (op === 'ahead') {
        this.delay += 0.5;
      } else if (op === 'reset') {
        this.delay = 0;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.set-delay-time-modal {
  .content {
    display: flex;
    justify-content: space-between;
    flex-direction: row;
    .item {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: var(--color-secondary-bg-for-transparent);
      text-align: center;
      line-height: 60px;
      user-select: none;
    }
    .item:hover {
      cursor: pointer;
    }
  }
  footer {
    justify-content: flex-start;
  }
}
</style>

<template>
  <Modal
    class="set-rate-modal"
    :show="show"
    :close="close"
    title="调整歌词进度"
    width="25vw"
    :style="isLyricPage ? 'background-color: rgba(0, 0, 0, 0.38)' : null"
  >
    <template slot="default">
      <div class="content">
        <span>0.5</span>
        <div class="slider">
          <vue-slider
            v-model="playRate"
            :min="5.1 / 10"
            :max="15 / 10"
            :interval="0.01"
            :drag-on-click="true"
            :duration="0"
            tooltip="none"
            :dot-size="12"
            :height="2"
            :silent="true"
          ></vue-slider>
        </div>
        <span>1.5</span>
      </div>
    </template>
    <template slot="footer">
      <div>当前速率：{{ currentRate }}x</div>
    </template>
  </Modal>
</template>

<script>
import Modal from '@/components/Modal.vue';
import VueSlider from 'vue-slider-component';
import { mapMutations, mapState, mapActions } from 'vuex';

export default {
  name: 'ModalSetRate',
  components: {
    Modal,
    VueSlider,
  },
  data() {
    return {
      currentRate: parseFloat(1),
    };
  },
  computed: {
    ...mapState(['modals', 'player', 'settings']),
    show: {
      get() {
        return this.modals.setPlayBackRate.show;
      },
      set(value) {
        this.updateModal({
          modalName: 'setPlayBackRate',
          key: 'show',
          value,
        });
      },
    },
    playRate: {
      get() {
        return this.player?.getRate();
      },
      set(value) {
        this.currentRate = value.toFixed(2);
        this.player?.setRate(value);
      },
    },
    isLyricPage() {
      return (
        this.settings.lyricsBackground !== false && this.$parent.showLyrics
      );
    },
  },
  created() {
    this.currentRate = this.playRate;
  },
  methods: {
    ...mapMutations(['updateModal', 'updateData', 'setDelayTime']),
    ...mapActions(['showToast']),
    close() {
      this.show = false;
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
.set-rate-modal {
  background: rgba(0, 0, 0, 0.38);

  .content {
    display: flex;
    align-items: center;
    justify-content: space-between;

    .slider {
      width: 100%;
      // flex-grow: grow;
      padding: 0 10px;
    }

    span {
      font-size: 15px;
      opacity: 0.58;
      min-width: 28px;
    }
  }
  footer {
    justify-content: flex-start;
  }
}
</style>

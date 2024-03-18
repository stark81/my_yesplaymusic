<template>
  <Modal
    class="accurate-match-track-modal"
    :show="show"
    :close="close"
    title="本地歌曲精确匹配"
    width="25vw"
  >
    <template slot="default">
      <input
        v-model="title"
        type="text"
        :placeholder="getTrackName"
        maxlength="40"
      />
    </template>
    <template slot="footer">
      <button class="primary block" @click="accurateMatchTrack">匹配</button>
    </template>
  </Modal>
</template>

<script>
import Modal from '@/components/Modal.vue';
import { mapMutations, mapState, mapActions } from 'vuex';
// import { getTrackDetail } from '@/api/track';
// import { getAlbum } from '@/api/album';

export default {
  name: 'ModalMatchTrack',
  components: {
    Modal,
  },
  data() {
    return {
      title: '',
      privatePlaylist: false,
    };
  },
  computed: {
    ...mapState(['modals']),
    show: {
      get() {
        return this.modals.accurateMatchModal.show;
      },
      set(value) {
        this.updateModal({
          modalName: 'accurateMatchModal',
          key: 'show',
          value,
        });
        if (value) {
          this.$store.commit('enableScrolling', false);
        } else {
          this.$store.commit('enableScrolling', true);
        }
      },
    },
    selectedTrackID: {
      get() {
        return this.modals.accurateMatchModal.selectedTrackID;
      },
      set(value) {
        this.updateModal({
          modalName: 'accurateMatchModal',
          key: 'selectedTrackID',
          value,
        });
      },
    },
    getTrackName() {
      const track = this.$store.state.localMusic.tracks.find(
        t => t.id === this.selectedTrackID
      );
      return track ? track.name : '';
    },
  },
  methods: {
    ...mapMutations(['updateModal']),
    ...mapActions(['showToast']),
    close() {
      this.show = false;
      this.title = '';
      this.selectedTrackID = 0;
    },
    async accurateMatchTrack() {
      // const localMusic = this.$store.state.localMusic;
      // const track = localMusic.trakcs.find(t => t.id === this.selectedTrackID);
      this.$store
        .dispatch('accurateMatchTrack', {
          id: this.selectedTrackID,
          title: this.title,
        })
        .then(() => {
          this.close();
        });
      // getTrackDetail(this.title).then(async data => {
      //   const matchTrack = data.songs[0];
      //   const al = await getAlbum(matchTrack.al.id);
      //   track.onlineTrack = matchTrack;
      //   album.onlineAlbum = al.album;
      // });
      // this.close();
    },
  },
};
</script>

<style lang="scss" scoped>
.accurate-match-track-modal {
  .content {
    display: flex;
    flex-direction: column;
    input {
      margin-bottom: 12px;
    }
    input[type='text'] {
      width: calc(100% - 24px);
      flex: 1;
      background: var(--color-secondary-bg-for-transparent);
      font-size: 16px;
      border: none;
      font-weight: 600;
      padding: 8px 12px;
      border-radius: 8px;
      margin-top: -1px;
      color: var(--color-text);
      &:focus {
        background: var(--color-primary-bg-for-transparent);
        opacity: 1;
      }
      [data-theme='light'] &:focus {
        color: var(--color-primary);
      }
    }
    .checkbox {
      input[type='checkbox' i] {
        margin: 3px 3px 3px 4px;
      }
      display: flex;
      align-items: center;
      label {
        font-size: 12px;
      }
      user-select: none;
    }
  }
}
</style>

<template>
  <Modal
    class="add-playlist-modal"
    :show="show"
    :close="close"
    :title="isLocal ? '新建离线歌单' : '新建歌单'"
    :style="isLyricPage ? 'background-color: rgba(0, 0, 0, 0.38)' : null"
    width="25vw"
  >
    <template slot="default">
      <input
        v-model="title"
        type="text"
        placeholder="歌单标题"
        maxlength="40"
      />
      <div v-show="!isLocal" class="checkbox">
        <input
          id="checkbox-private"
          v-model="privatePlaylist"
          type="checkbox"
        />
        <label for="checkbox-private">设置为隐私歌单</label>
      </div>
    </template>
    <template slot="footer">
      <button class="primary block" @click="createPlaylist">创建</button>
    </template>
  </Modal>
</template>

<script>
import Modal from '@/components/Modal.vue';
import locale from '@/locale';
import { mapMutations, mapState, mapActions } from 'vuex';
import { createPlaylist, addOrRemoveTrackFromPlaylist } from '@/api/playlist';

export default {
  name: 'ModalNewPlaylist',
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
    ...mapState(['modals', 'settings']),
    show: {
      get() {
        return this.modals.newPlaylistModal.show;
      },
      set(value) {
        this.updateModal({
          modalName: 'newPlaylistModal',
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
    isLocal: {
      get() {
        return this.modals.newPlaylistModal.isLocal;
      },
      set(value) {
        this.updateModal({
          modalName: 'newPlaylistModal',
          key: 'isLocal',
          value,
        });
      },
    },
    isLyricPage() {
      return (
        this.settings.lyricsBackground !== false && this.$parent.showLyrics
      );
    },
  },
  methods: {
    ...mapMutations(['updateModal', 'updateData']),
    ...mapActions([
      'showToast',
      'fetchLikedPlaylist',
      'createLocalPlayList',
      'addTrackToLocalPlaylist',
    ]),
    close() {
      this.show = false;
      this.isLocal = false;
      this.title = '';
      this.privatePlaylist = false;
      this.resetAfterCreateAddTrackID();
    },
    createPlaylist() {
      let params = { name: this.title };
      if (this.isLocal) {
        params.description = locale.t('localMusic.description');
        this.createLocalPlayList(params).then(playlist => {
          if (this.modals.newPlaylistModal.afterCreateAddTrackID !== 0) {
            this.addTrackToLocalPlaylist({
              pid: playlist.id,
              tracks: this.modals.newPlaylistModal.afterCreateAddTrackID,
            }).then(data => {
              if (data.code === 200) {
                this.showToast(locale.t('toast.savedToPlaylist'));
              } else {
                this.showToast(data.message);
              }
              this.resetAfterCreateAddTrackID();
            });
          }
          this.close();
          this.showToast('成功创建本地歌单');
        });
      } else {
        if (this.private) params.type = 10;
        createPlaylist(params).then(data => {
          if (data.code === 200) {
            if (this.modals.newPlaylistModal.afterCreateAddTrackID !== 0) {
              addOrRemoveTrackFromPlaylist({
                op: 'add',
                pid: data.id,
                tracks: this.modals.newPlaylistModal.afterCreateAddTrackID,
              }).then(data => {
                if (data.body.code === 200) {
                  this.showToast(locale.t('toast.savedToPlaylist'));
                } else {
                  this.showToast(data.body.message);
                }
                this.resetAfterCreateAddTrackID();
              });
            }
            this.close();
            this.showToast('成功创建歌单');
            this.updateData({ key: 'libraryPlaylistFilter', value: 'mine' });
            this.fetchLikedPlaylist();
          }
        });
      }
    },
    resetAfterCreateAddTrackID() {
      this.updateModal({
        modalName: 'newPlaylistModal',
        key: 'AfterCreateAddTrackID',
        value: 0,
      });
    },
  },
};
</script>

<style lang="scss" scoped>
.add-playlist-modal {
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

<template>
  <Modal
    class="add-track-to-playlist-modal"
    :show="show"
    :close="close"
    :show-footer="false"
    :title="isLocal ? '添加至离线歌单' : '添加到歌单'"
    width="25vw"
    :style="isLyricPage ? 'background-color: rgba(0, 0, 0, 0.38)' : null"
  >
    <template slot="default">
      <div class="new-playlist-button" @click="newPlaylist"
        ><svg-icon icon-class="plus" />新建歌单</div
      >
      <div
        v-for="playlist in ownPlaylists"
        :key="playlist.id"
        class="playlist"
        @click="addTrackToPlaylist(playlist.id)"
      >
        <img :src="playlist.coverImgUrl | resizeImage(224)" loading="lazy" />
        <div class="info">
          <div class="title">{{ playlist.name }}</div>
          <div class="track-count">{{ playlist.trackCount }} 首</div>
        </div>
      </div>
    </template>
  </Modal>
</template>

<script>
import { mapActions, mapMutations, mapState } from 'vuex';
import Modal from '@/components/Modal.vue';
import locale from '@/locale';
import { addOrRemoveTrackFromPlaylist } from '@/api/playlist';

export default {
  name: 'ModalAddTrackToPlaylist',
  components: {
    Modal,
  },
  data() {
    return {
      playlists: [],
    };
  },
  computed: {
    ...mapState(['modals', 'data', 'liked', 'localMusic', 'settings']),
    show: {
      get() {
        return this.modals.addTrackToPlaylistModal.show;
      },
      set(value) {
        this.updateModal({
          modalName: 'addTrackToPlaylistModal',
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
        return this.modals.addTrackToPlaylistModal.isLocal;
      },
      set(value) {
        this.updateModal({
          modalName: 'addTrackToPlaylistModal',
          key: 'isLocal',
          value,
        });
      },
    },
    ownPlaylists() {
      if (this.isLocal) {
        const playlist = this.localMusic.playlists.slice();
        const localList = playlist.reverse();
        return localList;
      } else {
        return this.liked.playlists.filter(
          p =>
            p.creator.userId === this.data.user.userId &&
            p.id !== this.data.likedSongPlaylistID
        );
      }
    },
    isLyricPage() {
      return (
        this.$parent.showLyrics && this.settings.lyricsBackground !== false
      );
    },
  },
  methods: {
    ...mapMutations(['updateModal']),
    ...mapActions(['showToast', 'addTrackToLocalPlaylist']),
    close() {
      this.isLocal = false;
      this.show = false;
    },
    addTrackToPlaylist(playlistID) {
      if (this.isLocal) {
        this.addTrackToLocalPlaylist({
          pid: playlistID,
          tracks: this.modals.addTrackToPlaylistModal.selectedTrackID,
        }).then(result => {
          if (result.code === 200) {
            this.isLocal = false;
            this.show = false;
            this.showToast(locale.t('toast.savedToPlaylist'));
          } else {
            this.showToast(result.message);
          }
        });
      } else {
        addOrRemoveTrackFromPlaylist({
          op: 'add',
          pid: playlistID,
          tracks: this.modals.addTrackToPlaylistModal.selectedTrackID,
        }).then(data => {
          if (data.body.code === 200) {
            this.show = false;
            this.showToast(locale.t('toast.savedToPlaylist'));
          } else {
            this.showToast(data.body.message);
          }
        });
      }
    },
    newPlaylist() {
      this.updateModal({
        modalName: 'newPlaylistModal',
        key: 'isLocal',
        value: this.isLocal,
      });
      this.updateModal({
        modalName: 'newPlaylistModal',
        key: 'afterCreateAddTrackID',
        value: this.modals.addTrackToPlaylistModal.selectedTrackID,
      });
      this.close();
      this.updateModal({
        modalName: 'newPlaylistModal',
        key: 'show',
        value: true,
      });
    },
  },
};
</script>

<style lang="scss" scoped>
.new-playlist-button {
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 16px;
  font-weight: 500;
  color: var(--color-text);
  background: var(--color-secondary-bg-for-transparent);
  border-radius: 8px;
  height: 48px;
  margin-bottom: 16px;
  margin-right: 6px;
  margin-left: 6px;
  cursor: pointer;
  transition: 0.2s;
  .svg-icon {
    width: 16px;
    height: 16px;
    margin-right: 8px;
  }
  &:hover {
    color: var(--color-primary);
    background: var(--color-primary-bg-for-transparent);
  }
}
.playlist {
  display: flex;
  padding: 6px;
  border-radius: 8px;
  cursor: pointer;
  &:hover {
    background: var(--color-secondary-bg-for-transparent);
  }
  img {
    border-radius: 8px;
    height: 42px;
    width: 42px;
    margin-right: 12px;
    border: 1px solid rgba(0, 0, 0, 0.04);
  }
  .info {
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .title {
    font-size: 16px;
    font-weight: 500;
    color: var(--color-text);
    padding-right: 16px;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
    overflow: hidden;
    word-break: break-all;
  }
  .track-count {
    margin-top: 2px;
    font-size: 13px;
    opacity: 0.68;
    color: var(--color-text);
  }
}
</style>

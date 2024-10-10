<template>
  <div class="track-list">
    <ContextMenu ref="menu">
      <div v-show="type !== 'cloudDisk'" class="item-info">
        <img :src="imageUrl" loading="lazy" />
        <div class="info">
          <div class="title">{{ rightClickedTrackComputed.name }}</div>
          <div class="subtitle">{{ rightClickedTrackComputed.ar[0].name }}</div>
        </div>
      </div>
      <hr v-show="type !== 'cloudDisk'" />
      <div class="item" @click="play">{{ $t('contextMenu.play') }}</div>
      <div class="item" @click="addToQueue([rightClickedTrack.id])">{{
        $t('contextMenu.addToQueue')
      }}</div>
      <div
        v-if="extraContextMenuItem.includes('accurateMatch')"
        class="item"
        @click="accurateMatchTrack"
        >{{ $t('contextMenu.accurateMatch') }}</div
      >
      <div
        v-if="extraContextMenuItem.includes('deleteMatch')"
        class="item"
        @click="deleteMatch"
        >{{ $t('contextMenu.deleteMatch') }}</div
      >
      <div
        v-if="extraContextMenuItem.includes('addToLocalList')"
        class="item"
        @click="addTrack2LocalPlaylist([rightClickedTrack.id])"
        >{{ $t('contextMenu.addToLocalPlaylist') }}</div
      >
      <div
        v-if="extraContextMenuItem.includes('removeTrackFromQueue')"
        class="item"
        @click="removeTrackFromQueue"
        >{{ $t('contextMenu.removeFromQueue') }}</div
      >
      <div
        v-if="extraContextMenuItem.includes('showInFolder')"
        class="item"
        @click="showInFolder"
        >{{ $t('contextMenu.showInFolder') }}</div
      >
      <div
        v-if="extraContextMenuItem.includes('removeLocalTrack')"
        class="item"
        @click="removeLocalTrack"
        >{{ $t('contextMenu.removeLocalTrack') }}</div
      >
      <hr v-show="type !== 'cloudDisk' || 'localtracks'" />
      <div
        v-show="
          !isRightClickedTrackLiked &&
          type !== 'cloudDisk' &&
          !rightClickedTrack.isLocal
        "
        class="item"
        @click="like"
      >
        {{ $t('contextMenu.saveToMyLikedSongs') }}
      </div>
      <div
        v-show="
          isRightClickedTrackLiked &&
          type !== 'cloudDisk' &&
          !rightClickedTrack.isLocal
        "
        class="item"
        @click="like"
      >
        {{ $t('contextMenu.removeFromMyLikedSongs') }}
      </div>
      <div
        v-if="extraContextMenuItem.includes('removeTrackFromPlaylist')"
        class="item"
        @click="removeTrackFromPlaylist"
        >从歌单中删除</div
      >
      <div
        v-show="type !== 'cloudDisk'"
        class="item"
        @click="addTrackToPlaylist(rightClickedTrack.matched === true)"
        >{{ $t('contextMenu.addToPlaylist') }}</div
      >
      <div
        v-show="type !== 'cloudDisk' && !rightClickedTrack.isLocal"
        class="item"
        @click="copyLink"
        >{{ $t('contextMenu.copyUrl') }}</div
      >
      <div
        v-if="extraContextMenuItem.includes('removeTrackFromCloudDisk')"
        class="item"
        @click="removeTrackFromCloudDisk"
        >从云盘中删除</div
      >
    </ContextMenu>

    <VirtualScroll
      ref="virtualScrollRef"
      :list="tracks"
      :column-number="columnNumber"
      :show-position="showPosition"
      :item-size="itemSize"
      :type="type"
      :enabled="enabled"
    >
      <template #default="{ item, index }">
        <TrackListItem
          ref="trackListItemRef"
          :key="itemKey === 'id' ? item.id : `${item.id}${index}`"
          :track-prop="item"
          :type="type"
          :track-no="index + 1"
          :album-object="albumObject"
          :batch-op="isBatchOp"
          :highlight-playing-track="highlightPlayingTrack"
          @dblclick.native="playThisList(item.id || item.songId)"
          @click.right.native="openMenu($event, item, index)"
        />
      </template>
    </VirtualScroll>
  </div>
</template>

<script>
import { mapActions, mapMutations, mapState } from 'vuex';
import { addOrRemoveTrackFromPlaylist } from '@/api/playlist';
import { cloudDiskTrackDelete } from '@/api/user';
import { isAccountLoggedIn } from '@/utils/auth';

import TrackListItem from '@/components/TrackListItem.vue';
import VirtualScroll from '@/components/VirtualScroll.vue';
import ContextMenu from '@/components/ContextMenu.vue';
import locale from '@/locale';

export default {
  name: 'TrackList',
  components: {
    TrackListItem,
    ContextMenu,
    VirtualScroll,
  },
  props: {
    tracks: {
      type: Array,
      default: () => {
        return [];
      },
    },
    type: {
      type: String,
      default: 'tracklist',
    }, // tracklist | album | playlist | cloudDisk
    id: {
      type: Number,
      default: 0,
    },
    showPosition: { type: Boolean, default: true },
    enabled: {
      type: Boolean,
      default: true,
    },
    dbclickTrackFunc: {
      type: String,
      default: 'default',
    },
    albumObject: {
      type: Object,
      default: () => {
        return {
          artist: {
            name: '',
          },
        };
      },
    },
    extraContextMenuItem: {
      type: Array,
      default: () => {
        return [
          // 'removeTrackFromPlaylist'
          // 'removeTrackFromQueue'
          // 'removeTrackFromCloudDisk'
        ];
      },
    },
    columnNumber: {
      type: Number,
      default: 1,
    },
    highlightPlayingTrack: {
      type: Boolean,
      default: true,
    },
    isBatchOp: {
      type: Boolean,
      default: false,
    },
    itemKey: {
      type: String,
      default: 'id',
    },
    itemSize: {
      type: Number,
      default: 64,
    },
  },
  data() {
    return {
      rightClickedTrack: {
        id: 0,
        name: '',
        ar: [{ name: '' }],
        al: { picUrl: '' },
      },
      rightClickedTrackIndex: -1,
      selectedList: [],
    };
  },
  computed: {
    ...mapState(['liked', 'player']),
    isRightClickedTrackLiked() {
      return this.liked.songs.includes(this.rightClickedTrack?.id);
    },
    rightClickedTrackComputed() {
      return this.type === 'cloudDisk'
        ? {
            id: 0,
            name: '',
            ar: [{ name: '' }],
            al: { picUrl: '' },
          }
        : this.rightClickedTrack;
    },
    isSelectAll() {
      return this.selectedList.length === this.tracks.length;
    },
    useLocal() {
      return (
        this.rightClickedTrackComputed.isLocal &&
        !this.rightClickedTrackComputed.matched
      );
    },
    imageUrl() {
      return this.useLocal
        ? `atom://get-pic/${this.rightClickedTrackComputed.filePath}`
        : this.rightClickedTrackComputed.al.picUrl + '?param=64y64';
    },
  },
  mounted() {
    this.$parent.$parent.$refs.main.style.paddingBottom = '0';
  },
  beforeDestroy() {
    this.$parent.$parent.$refs.main.style.paddingBottom = '96px';
  },
  methods: {
    ...mapMutations(['updateModal']),
    ...mapActions([
      'nextTrack',
      'showToast',
      'likeATrack',
      'deleteMatchTrack',
      'rmTrackFromLocalPlaylist',
    ]),
    openMenu(e, track, index = -1) {
      this.rightClickedTrack = track;
      this.rightClickedTrackIndex = index;
      this.$refs.menu.openMenu(e);
    },
    closeMenu() {
      this.rightClickedTrack = {
        id: 0,
        name: '',
        ar: [{ name: '' }],
        al: { picUrl: '' },
      };
      this.rightClickedTrackIndex = -1;
    },
    playThisList(trackID) {
      if (this.dbclickTrackFunc === 'default') {
        this.playThisListDefault(trackID);
      } else if (this.dbclickTrackFunc === 'none') {
        // do nothing
      } else if (this.dbclickTrackFunc === 'playTrackOnListByID') {
        this.player.playTrackOnListByID(trackID);
      } else if (this.dbclickTrackFunc === 'playPlaylistByID') {
        this.player.playPlaylistByID(this.id, trackID);
      } else if (this.dbclickTrackFunc === 'playAList') {
        let trackIDs = this.tracks.map(t => t.id || t.songId);
        this.player.replacePlaylist(trackIDs, this.id, 'artist', trackID);
      } else if (this.dbclickTrackFunc === 'dailyTracks') {
        let trackIDs = this.tracks.map(t => t.id);
        this.player.replacePlaylist(trackIDs, '/daily/songs', 'url', trackID);
      } else if (this.dbclickTrackFunc === 'playCloudDisk') {
        let trackIDs = this.tracks.map(t => t.id || t.songId);
        this.player.replacePlaylist(trackIDs, this.id, 'cloudDisk', trackID);
      }
    },
    playThisListDefault(trackID) {
      if (this.type === 'playlist') {
        this.player.playPlaylistByID(this.id, trackID);
      } else if (this.type === 'album') {
        this.player.playAlbumByID(this.id, trackID);
      } else if (this.type === 'tracklist') {
        let trackIDs = this.tracks.map(t => t.id);
        this.player.replacePlaylist(trackIDs, this.id, 'artist', trackID);
      } else if (this.type === 'localTracks') {
        let trackIDs = this.tracks.map(t => t.id);
        this.player.replacePlaylist(trackIDs, this.id, 'localTracks', trackID);
      }
    },
    scrollTo(top, behavior = 'smooth') {
      this.$parent.scrollTo(top, behavior);
    },
    play() {
      this.player.addTrackToPlayNext(this.rightClickedTrack.id, true);
    },
    addToQueue(trackID = []) {
      if (!trackID.length) {
        trackID = this.selectedList;
      }
      for (let id of trackID) {
        this.player.addTrackToPlayNext(id);
      }
    },
    selectAll() {
      if (this.isSelectAll) {
        this.selectedList = [];
      } else {
        this.selectedList = this.tracks.map(t => t.id);
      }
    },
    doFinish() {
      this.selectedList = [];
    },
    like() {
      this.likeATrack(this.rightClickedTrack.id);
    },
    accurateMatchTrack() {
      this.updateModal({
        modalName: 'accurateMatchModal',
        key: 'show',
        value: true,
      });
      this.updateModal({
        modalName: 'accurateMatchModal',
        key: 'selectedTrackID',
        value: this.rightClickedTrack.id,
      });
    },
    deleteMatch() {
      if (this.useLocal) {
        this.showToast('该歌曲没有匹配信息');
        return;
      }
      if (confirm('确定清除当前歌曲的匹配信息？')) {
        this.deleteMatchTrack(this.rightClickedTrackComputed.id);
      }
    },
    addTrackToPlaylist(useOnline = false) {
      if (!isAccountLoggedIn()) {
        this.showToast(locale.t('toast.needToLogin'));
        return;
      }
      this.updateModal({
        modalName: 'addTrackToPlaylistModal',
        key: 'show',
        value: true,
      });
      this.updateModal({
        modalName: 'addTrackToPlaylistModal',
        key: 'selectedTrackID',
        value: !useOnline
          ? this.rightClickedTrack.id
          : this.rightClickedTrack.onlineTrack.id,
      });
    },
    showInFolder() {
      const songID = this.rightClickedTrack.id;
      const { songs, tracks } = this.$store.state.localMusic;
      const song = songs.find(s => s.id === songID);
      const track = tracks.find(t => t.id === song.trackID);
      const filePath = track.filePath;
      const { shell } = require('electron');
      shell.showItemInFolder(filePath);
    },
    removeLocalTrack() {
      this.$store.dispatch('removeLocalTrack', {
        id: this.rightClickedTrack.id,
      });
    },
    addTrack2LocalPlaylist(trackIDs = []) {
      if (!trackIDs.length) {
        trackIDs = this.selectedList;
      }
      this.updateModal({
        modalName: 'addTrackToPlaylistModal',
        key: 'isLocal',
        value: true,
      });
      this.updateModal({
        modalName: 'addTrackToPlaylistModal',
        key: 'show',
        value: true,
      });
      this.updateModal({
        modalName: 'addTrackToPlaylistModal',
        key: 'selectedTrackID',
        value: trackIDs,
      });
    },
    removeTrackFromPlaylist() {
      if (this.type === 'localtracks') {
        if (confirm(`确定要从歌单删除 ${this.rightClickedTrack.name}？`)) {
          let trackID = this.rightClickedTrack.id;
          this.rmTrackFromLocalPlaylist({
            pid: this.id,
            tracks: trackID,
          }).then(data => {
            this.showToast(
              data.code === 200
                ? locale.t('toast.removedFromPlaylist')
                : data.message
            );
            this.$parent.removeTrack(trackID);
          });
        }
      } else {
        if (!isAccountLoggedIn()) {
          this.showToast(locale.t('toast.needToLogin'));
          return;
        }
        if (confirm(`确定要从歌单删除 ${this.rightClickedTrack.name}？`)) {
          let trackID = this.rightClickedTrack.id;
          addOrRemoveTrackFromPlaylist({
            op: 'del',
            pid: this.id,
            tracks: trackID,
          }).then(data => {
            this.showToast(
              data.body.code === 200
                ? locale.t('toast.removedFromPlaylist')
                : data.body.message
            );
            this.$parent.removeTrack(trackID);
          });
        }
      }
    },
    copyLink() {
      this.$copyText(
        `https://music.163.com/song?id=${this.rightClickedTrack.id}`
      )
        .then(() => {
          this.showToast(locale.t('toast.copied'));
        })
        .catch(err => {
          this.showToast(`${locale.t('toast.copyFailed')}${err}`);
        });
    },
    removeTrackFromQueue() {
      this.$store.state.player.removeTrackFromQueue(
        this.rightClickedTrackIndex
      );
    },
    removeTrackFromCloudDisk() {
      if (confirm(`确定要从云盘删除 ${this.rightClickedTrack.songName}？`)) {
        let trackID = this.rightClickedTrack.songId;
        cloudDiskTrackDelete(trackID).then(data => {
          this.showToast(
            data.code === 200 ? '已将此歌曲从云盘删除' : data.message
          );
          let newCloudDisk = this.liked.cloudDisk.filter(
            t => t.songId !== trackID
          );
          this.$store.commit('updateLikedXXX', {
            name: 'cloudDisk',
            data: newCloudDisk,
          });
        });
      }
    },
  },
};
</script>

<style lang="scss" scoped></style>

<template>
  <div v-show="show" ref="localMusicRef">
    <h1>
      <img
        class="avatar"
        :src="data.user.avatarUrl | resizeImage"
        loading="lazy"
      />
      {{
        data.user.nickname
          ? `${data.user.nickname}${$t('localMusic.sLocalMusic')}`
          : $t('contextMenu.localMusic')
      }}
    </h1>

    <div class="section-one">
      <div class="liked-songs">
        <div class="top">
          <p>
            <span
              v-for="(line, index) in pickedLyric"
              v-show="line !== ''"
              :key="`${line}${index}`"
              >{{ line }}<br
            /></span>
          </p>
        </div>
        <div class="bottom">
          <div class="titles">
            <div class="title">{{ $t('localMusic.latedAdd') }}</div>
            <div class="sub-title">
              {{ localTrackLenght }}{{ $t('common.songs') }}
            </div>
          </div>
          <button @click="playThisTrack">
            <svg-icon icon-class="play" />
          </button>
        </div>
      </div>
      <div class="songs">
        <TrackList
          :id="sortedTracks.id"
          :tracks="randomShowTracks"
          :column-number="3"
          type="tracklist"
          :extra-context-menu-item="[
            'showInFolder',
            'removeLocalTrack',
            'addToLocalList',
            'reMatch',
            'accurateMatch',
          ]"
        />
      </div>
    </div>

    <div class="section-two">
      <div class="tabs-row">
        <div class="tabs">
          <div
            class="tab dropdown"
            :class="{ active: currentTab === 'localSongs' }"
            @click="updateCurrentTab('localSongs')"
          >
            <span class="text">{{ $t('contextMenu.localMusic') }}</span>
            <span class="icon" @click.stop="openPlaylistTabMenu"
              ><svg-icon icon-class="dropdown"
            /></span>
          </div>
          <div
            v-if="!isBatchOp"
            class="tab"
            :class="{ active: currentTab === 'playlists' }"
            @click="updateCurrentTab('playlists')"
          >
            {{ $t('localMusic.playlist') }}
          </div>
          <div v-if="isBatchOp" class="tab" @click="batchOperation('playlist')">
            {{ $t('contextMenu.addToLocalPlaylist') }}
          </div>
          <div
            v-if="!isBatchOp"
            class="tab"
            :class="{ active: currentTab === 'albums' }"
            @click="updateCurrentTab('albums')"
          >
            {{ $t('library.albums') }}
          </div>
          <div v-if="isBatchOp" class="tab" @click="batchOperation('queue')">
            {{ $t('contextMenu.addToQueue') }}
          </div>
          <div
            v-if="!isBatchOp"
            class="tab"
            :class="{ active: currentTab === 'artists' }"
            @click="updateCurrentTab('artists')"
          >
            {{ $t('library.artists') }}
          </div>
          <div v-if="isBatchOp" class="tab" @click="batchOperation('remove')">
            {{ $t('contextMenu.removeLocalTrack') }}
          </div>
          <div v-if="isBatchOp" class="tab" @click="batchOperation('recovery')">
            {{ $t('contextMenu.recoveryTrack') }}
          </div>
          <div v-if="isBatchOp" class="tab" @click="batchOpSwitch">
            {{ $t('contextMenu.finish') }}
          </div>
        </div>
        <div v-if="currentTab === 'localSongs'" class="search-box">
          <div class="container" :class="{ active: inputFocus }">
            <svg-icon icon-class="search" />
            <div class="input">
              <input
                v-model.trim="inputKeywords"
                :placeholder="inputFocus ? '' : $t('localMusic.search')"
                @input="inputDebounce()"
                @focus="inputFocus = true"
                @blur="inputFocus = false"
              />
            </div>
          </div>
        </div>
        <button
          v-show="currentTab === 'playlists'"
          class="tab-button"
          @click="openAddPlaylistModal"
          ><svg-icon icon-class="plus" />{{ $t('library.newPlayList') }}
        </button>
      </div>

      <div v-show="currentTab === 'localSongs'">
        <TrackList
          ref="trackListRef"
          :tracks="filterLocalTracks"
          :column-number="1"
          type="localtracks"
          :is-batch-op="isBatchOp"
          :selected-track-ids="selectedTrackIds"
          :extra-context-menu-item="[
            'showInFolder',
            'removeLocalTrack',
            'addToLocalList',
            'reMatch',
            'accurateMatch',
          ]"
        />
      </div>

      <div v-show="currentTab === 'playlists'">
        <div v-if="localMusic.playlists.length > 0">
          <CoverRow
            :items="filterPlaylists"
            type="localPlaylist"
            :show-play-button="true"
          />
        </div>
      </div>

      <div v-show="currentTab === 'albums'">
        <CoverRow
          :items="activeAlbums"
          type="album"
          sub-text="artist"
          :show-play-button="true"
        />
      </div>

      <div v-show="currentTab === 'artists'">
        <CoverRow
          :items="activeArtists"
          type="artist"
          :show-play-button="true"
        />
      </div>
    </div>

    <ModalMatchTrack />

    <ContextMenu ref="playlistTabMenu">
      <div
        class="item"
        @click="updateLocalMusicXXX({ name: 'sortBy', data: 'default' })"
        >{{ $t('contextMenu.defaultSort') }}</div
      >
      <div
        class="item"
        @click="updateLocalMusicXXX({ name: 'sortBy', data: 'byname' })"
        >{{ $t('contextMenu.sortByName') }}</div
      >
      <div
        class="item"
        @click="updateLocalMusicXXX({ name: 'sortBy', data: 'descend' })"
        >{{ $t('contextMenu.descendSort') }}</div
      >
      <div
        class="item"
        @click="updateLocalMusicXXX({ name: 'sortBy', data: 'ascend' })"
        >{{ $t('contextMenu.ascendSort') }}</div
      >
      <hr />
      <div v-if="isBatchOp" class="item" @click="selectAll">{{
        $t('contextMenu.selectAll')
      }}</div>
      <div v-else class="item" @click="batchOpSwitch">{{
        $t('contextMenu.batchOperation')
      }}</div>
    </ContextMenu>

    <div v-if="!inputFocus" class="position">
      <div
        v-if="isLocal && currentTab === 'localSongs'"
        @click="playingTrackPosition"
        >{{ $t('localMusic.positionTrack') }}</div
      >
      <div @click="scrollToTop">{{ $t('localMusic.scrollToTop') }}</div>
    </div>
  </div>
</template>

<script>
import { mapState, mapMutations, mapActions } from 'vuex';
import { randomNum } from '@/utils/common';
import TrackList from '@/components/TrackList.vue';
import ContextMenu from '@/components/ContextMenu.vue';
import CoverRow from '@/components/CoverRow.vue';
import { getLyric } from '@/api/track';
import SvgIcon from '@/components/SvgIcon.vue';
import ModalMatchTrack from '@/components/ModalMatchTrack.vue';
import NProgress from 'nprogress';

function extractLyricPart(rawLyric) {
  return rawLyric.split(']').pop().trim();
}

function getRandomNumbersFromList(list, count) {
  const listCopy = list.slice();
  const result = [];

  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * listCopy.length);
    const randomNumber = listCopy[randomIndex];

    result.push(randomNumber);
    listCopy.splice(randomIndex, 1);
  }

  return result;
}

export default {
  name: 'LocalMusic',
  components: { SvgIcon, CoverRow, ContextMenu, TrackList, ModalMatchTrack },
  data() {
    return {
      show: false,
      sortedTracks: [],
      lyric: undefined,
      randomTrackID: 0,
      lyricSong: undefined,
      isBatchOp: false,
      selectedTrackIds: [],
      currentTab: null,
      searchKeyWords: '', // 搜索使用的关键字
      inputKeywords: '', // 搜索框中正在输入的关键字
      inputFocus: false,
      activeTracks: [],
      activeAlbums: [],
      activeArtists: [],
      randomShowTracks: [],
      timer: null,
    };
  },
  computed: {
    ...mapState(['data', 'locals', 'localMusic', 'settings', 'player']),
    isLocal() {
      return this.$store.state.player.currentTrack?.isLocal === true;
    },
    sortBy() {
      return this.localMusic.sortBy;
    },
    filterLatestAdd() {
      const idx = randomNum(0, this.activeTracks.length - 12);
      return this.activeTracks.slice(idx, idx + 12);
    },
    filterLocalTracks() {
      return this.activeTracks.filter(
        track =>
          (track.name &&
            track.name
              .toLowerCase()
              .includes(this.searchKeyWords.toLowerCase())) ||
          (track.al.name &&
            track.al.name
              .toLowerCase()
              .includes(this.searchKeyWords.toLowerCase())) ||
          track.ar.find(
            artist =>
              artist.name &&
              artist.name
                .toLowerCase()
                .includes(this.searchKeyWords.toLowerCase())
          )
      );
    },
    allTracks() {
      const tracks = this.localMusic.tracks.filter(t => t.show && !t.delete);
      return tracks;
    },
    localTrackLenght() {
      return this.allTracks.length;
    },
    filterLocalAlbums() {
      const albumArray = this.allTracks.map(tr => tr.al);
      return [...new Map(albumArray.map(al => [al.name, al])).values()];
    },
    filterLocalArtists() {
      const artistsArray = this.allTracks?.map(tr => tr.ar).flat(Infinity);
      return [...new Map(artistsArray.map(ar => [ar.name, ar])).values()];
    },
    filterPlaylists() {
      return this.localMusic?.playlists?.slice().reverse();
    },
    pickedLyric() {
      /** @type {string?} */
      const lyric = this.lyric;

      // Returns [] if we got no lyrics.
      if (!lyric) return [];

      let lyricLine = lyric.split('\n').filter(line => line !== '');
      if (lyricLine.length > 16) {
        lyricLine = lyricLine.slice(7, -7);
      }

      // Pick 3 or fewer lyrics based on the lyric lines.
      const lyricsToPick = Math.min(lyricLine.length, 3);

      // The upperBound of the lyric line to pick
      const randomUpperBound = lyricLine.length - lyricsToPick;
      const startLyricLineIndex = randomNum(0, randomUpperBound - 1);

      // Pick lyric lines to render.
      const returnLyricLine = lyricLine
        .slice(startLyricLineIndex, startLyricLineIndex + lyricsToPick)
        .map(extractLyricPart);
      if (returnLyricLine.length > 0 && this.lyricSong) {
        returnLyricLine.push(`————《${this.lyricSong}》`);
      }
      return returnLyricLine;
    },
  },
  watch: {
    currentTab(val) {
      if (val !== 'localSongs' && this.debounceTimeout) {
        this.searchKeyWords = '';
        this.inputKeywords = '';
        clearTimeout(this.debounceTimeout);
      }
    },
    sortBy(val) {
      this.activeTracks = this.sortList(this.activeTracks, val);
    },
    localTrackLenght() {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        this.randomShowTracks =
          this.allTracks.length > 12
            ? getRandomNumbersFromList(this.allTracks, 12)
            : this.allTracks;
        const tracks = this.sortList(this.allTracks, this.sortBy);
        this.activeTracks = tracks;
        this.activeAlbums = this.filterLocalAlbums;
        this.activeArtists = this.filterLocalArtists;
      }, 1500);
    },
  },
  created() {
    setTimeout(() => {
      if (!this.show) NProgress.start();
    });
    this.currentTab = this.$store.state.settings.localMusicShowDefault;
    this.loadData();
  },
  activated() {
    this.$parent.$refs.scrollbar.restorePosition();
    this.getRandomLyric();
  },
  methods: {
    ...mapMutations(['updateData', 'updateLocalMusicXXX', 'updateModal']),
    ...mapActions([
      'showToast',
      'rmTrackFromLocalPlaylist',
      'addTrackToPlayNext',
    ]),
    scrollToTop() {
      this.$parent.$refs.main.scrollTo({ top: 0, behavior: 'smooth' });
    },
    loadData() {
      NProgress.done();
      this.show = true;
      this.getRandomLyric();

      let tracks = this.allTracks.slice();
      const albums = this.filterLocalAlbums.slice().reverse();
      const artists = this.filterLocalArtists.slice().reverse();

      // 随机显示的12首歌
      // const idx = tracks.length > 12 ? randomNum(0, tracks.length - 12) : 0;
      this.randomShowTracks =
        tracks.length > 12 ? getRandomNumbersFromList(tracks, 12) : tracks;
      tracks = this.sortList(tracks, this.sortBy);

      // 首页先加载20首歌，20个专辑，20个歌手，然后再异步加载剩余的
      this.activeTracks = tracks.slice(0, 20);
      this.activeAlbums = albums.slice(0, 20);
      this.activeArtists = artists.slice(0, 20);

      setTimeout(() => {
        this.activeTracks.push(...tracks.slice(20));
        this.activeAlbums.push(...albums.slice(20));
        this.activeArtists.push(...artists.slice(20));
      });
    },
    playingTrackPosition() {
      const trackref = this.$refs.trackListRef.$refs.trackListItemRef.find(
        t => t.isPlaying
      );
      if (trackref) {
        trackref.$el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    },
    inputDebounce() {
      if (this.debounceTimeout) clearTimeout(this.debounceTimeout);
      this.debounceTimeout = setTimeout(() => {
        this.searchKeyWords = this.inputKeywords;
      }, 200);
    },
    updateCurrentTab(tab) {
      this.currentTab = tab;
      this.$parent.$refs.main.scrollTo({ top: 375, behavior: 'smooth' });
    },
    selectAll() {
      this.$refs.trackListRef.$refs.trackListItemRef.forEach(item => {
        item.isSelected = true;
      });
    },
    batchOpSwitch() {
      this.currentTab = 'localSongs';
      this.updateCurrentTab(this.currentTab);
      this.isBatchOp = !this.isBatchOp;
      this.$refs.trackListRef.$refs.trackListItemRef.forEach(item => {
        item.isSelected = false;
      });
    },
    batchOperation(type) {
      const trackIDs = this.$refs.trackListRef.$refs.trackListItemRef
        .filter(t => t.isSelected)
        .map(t => t.track.id);
      if (type === 'playlist') {
        this.$refs.trackListRef.addTrack2LocalPlaylist(trackIDs);
      } else if (type === 'queue') {
        for (const trackID of trackIDs) {
          this.$refs.trackListRef.addToQueue(trackID);
        }
        this.showToast('已添加至队列');
      } else if (type === 'recovery') {
        const songs = this.$store.state.localMusic.songs;
        songs.forEach(song => {
          song.delete = false;
        });
      } else if (type === 'remove') {
        trackIDs.forEach(id => {
          const song = this.$store.state.localMusic.songs.find(
            s => s.id === id
          );
          song.delete = true;
          const playlists = this.$store.state.localMusic.playlists.filter(p =>
            p.trackIds.includes(id)
          );
          playlists.forEach(playlist => {
            this.rmTrackFromLocalPlaylist({
              pid: playlist.id,
              tracks: id,
            });
          });
        });
      }
      this.batchOpSwitch();
    },
    openAddPlaylistModal() {
      this.updateModal({
        modalName: 'newPlaylistModal',
        key: 'isLocal',
        value: true,
      });
      this.updateModal({
        modalName: 'newPlaylistModal',
        key: 'show',
        value: true,
      });
    },
    openPlaylistTabMenu(e) {
      this.$refs.playlistTabMenu.openMenu(e);
    },
    playThisTrack() {
      this.player.addTrackToPlayNext(this.randomTrackID, true, true);
    },
    getRandomLyric() {
      const tracksID = this.allTracks.filter(tr => tr.matched).map(tr => tr.id);
      if (tracksID.length < 1) return;
      const randomTrackID = tracksID[randomNum(0, tracksID.length - 1)];
      const track = this.localMusic.tracks
        ?.filter(t => t.matched)
        .find(t => t.id === randomTrackID);
      this.randomTrackID = randomTrackID;
      getLyric(randomTrackID).then(data => {
        if (data.lrc !== undefined) {
          const isInstrumental = data.lrc.lyric
            .split('\n')
            .filter(l => l.includes('纯音乐，请欣赏'));
          if (isInstrumental.length === 0) {
            this.lyric = data.lrc.lyric;
            this.lyricSong = track.name;
          }
        }
      });
    },
    sortList(tracks, type) {
      if (type === 'default') {
        return tracks.sort((a, b) => a.id - b.id);
      } else if (type === 'byname') {
        const newTracks = tracks.sort((a, b) => {
          return a['name'].localeCompare(b['name'], 'zh-CN', { numeric: true });
        });
        return newTracks;
      } else if (type === 'descend') {
        const trackList = tracks.sort((a, b) => {
          const timeA = new Date(a.createTime).getTime();
          const timeB = new Date(b.createTime).getTime();
          return timeB - timeA;
        });
        return trackList;
      } else if (type === 'ascend') {
        const trackList = tracks.sort((a, b) => {
          const timeA = new Date(a.createTime).getTime();
          const timeB = new Date(b.createTime).getTime();
          return timeA - timeB;
        });
        return trackList;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
h1 {
  font-size: 42px;
  color: var(--color-text);
  display: flex;
  align-items: center;
  .avatar {
    height: 44px;
    margin-right: 12px;
    vertical-align: -7px;
    border-radius: 50%;
    border: rgba(0, 0, 0, 0.2);
  }
}

.section-one {
  display: flex;
  margin-top: 24px;
  .songs {
    flex: 7;
    margin-top: 8px;
    margin-left: 36px;
    overflow: hidden;
  }
}

.liked-songs {
  flex: 3;
  margin-top: 8px;
  cursor: pointer;
  border-radius: 16px;
  padding: 18px 24px;
  display: flex;
  flex-direction: column;
  transition: all 0.4s;
  box-sizing: border-box;

  background: var(--color-primary-bg);

  .bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: var(--color-primary);

    .title {
      font-size: 24px;
      font-weight: 700;
    }
    .sub-title {
      font-size: 15px;
      margin-top: 2px;
    }

    button {
      margin-bottom: 2px;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 44px;
      width: 44px;
      background: var(--color-primary);
      border-radius: 50%;
      transition: 0.2s;
      box-shadow: 0 6px 12px -4px rgba(0, 0, 0, 0.2);
      cursor: default;

      .svg-icon {
        color: var(--color-primary-bg);
        margin-left: 4px;
        height: 16px;
        width: 16px;
      }
      &:hover {
        transform: scale(1.06);
        box-shadow: 0 6px 12px -4px rgba(0, 0, 0, 0.4);
      }
      &:active {
        transform: scale(0.94);
      }
    }
  }

  .top {
    flex: 1;
    display: flex;
    flex-wrap: wrap;
    font-size: 16px;
    opacity: 0.88;
    color: var(--color-primary);
    p {
      margin-top: 2px;
    }
  }
}

.section-two {
  margin-top: 54px;
  min-height: calc(100vh - 182px);
}

.tabs-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 24px;
}
.search-box {
  display: flex;
  right: 20px;
  justify-content: flex-end;
  -webkit-app-region: no-drag;

  .container {
    display: flex;
    align-items: center;
    height: 32px;
    background: var(--color-secondary-bg-for-transparent);
    border-radius: 8px;
    width: 200px;
  }

  .svg-icon {
    height: 15px;
    width: 15px;
    color: var(--color-text);
    opacity: 0.28;
    margin: {
      left: 8px;
      right: 4px;
    }
  }

  input {
    font-size: 16px;
    border: none;
    background: transparent;
    width: 96%;
    font-weight: 600;
    margin-top: -1px;
    color: var(--color-text);
  }

  .active {
    background: var(--color-primary-bg-for-transparent);
    input,
    .svg-icon {
      opacity: 1;
      color: var(--color-primary);
    }
  }
}
[data-theme='dark'] {
  .search-box {
    .active {
      input,
      .svg-icon {
        color: var(--color-text);
      }
    }
  }
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  font-size: 18px;
  color: var(--color-text);
  .tab {
    font-weight: 600;
    padding: 8px 14px;
    margin-right: 14px;
    border-radius: 8px;
    cursor: pointer;
    user-select: none;
    transition: 0.2s;
    opacity: 0.68;
    &:hover {
      opacity: 0.88;
      background-color: var(--color-secondary-bg);
    }
  }
  .tab.active {
    opacity: 0.88;
    background-color: var(--color-secondary-bg);
  }
  .tab.dropdown {
    display: flex;
    align-items: center;
    padding: 0;
    overflow: hidden;
    .text {
      padding: 8px 3px 8px 14px;
    }
    .icon {
      height: 100%;
      display: flex;
      align-items: center;
      padding: 0 8px 0 3px;
      .svg-icon {
        height: 16px;
        width: 16px;
      }
    }
  }
}

button.tab-button {
  color: var(--color-text);
  border-radius: 8px;
  padding: 0 14px;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: 0.2s;
  opacity: 0.68;
  font-weight: 500;
  .svg-icon {
    width: 14px;
    height: 14px;
    margin-right: 8px;
  }
  &:hover {
    opacity: 1;
    background: var(--color-secondary-bg);
  }
  &:active {
    opacity: 1;
    transform: scale(0.92);
  }
}

button.playHistory-button {
  color: var(--color-text);
  border-radius: 8px;
  padding: 6px 8px;
  margin-bottom: 12px;
  margin-right: 4px;
  transition: 0.2s;
  opacity: 0.68;
  font-weight: 500;
  cursor: pointer;
  &:hover {
    opacity: 1;
    background: var(--color-secondary-bg);
  }
  &:active {
    transform: scale(0.95);
  }
}

button.playHistory-button--selected {
  color: var(--color-text);
  background: var(--color-secondary-bg);
  opacity: 1;
  font-weight: 700;
  &:active {
    transform: none;
  }
}

.position {
  position: fixed;
  width: 100px;
  line-height: 40px;
  padding: 10px 0;
  border-radius: 10px;
  box-shadow: 0 8px 12px -6px rgba(0, 0, 0, 0.1);
  text-align: center;
  background: var(--color-secondary-bg);
  border: 1px solid rgba(60, 60, 60, 0.08);
  opacity: 0.75;
  color: var(--color-text);
  top: 50%;
  right: 30px;
  transform: translate(0, -50%);
  transition: opacity 0.3s ease;
}
.position:hover {
  opacity: 0.9;
  cursor: pointer;
}
[data-theme='dark'] {
  .position {
    border: 1px solid rgba(255, 255, 255, 0.08);
  }
}
</style>

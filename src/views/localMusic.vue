<template>
  <div>
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
              {{ localTracks.length }}{{ $t('common.songs') }}
            </div>
          </div>
          <button @click="playThisTrack">
            <svg-icon icon-class="play" />
          </button>
        </div>
      </div>
      <div class="songs">
        <TrackList
          :id="0"
          :tracks="randomTracks"
          :column-number="3"
          type="localTracklist"
          :show-position="false"
          :item-size="57"
          :enabled="false"
          :extra-context-menu-item="[
            'showInFolder',
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
            :class="{ active: currentTab === 'localTracks' }"
            @click="updateTab('localTracks')"
          >
            <span class="text">{{ $t('contextMenu.localMusic') }}</span>
            <span class="icon" @click.stop="openLocalTracksTabMenu"
              ><svg-icon icon-class="dropdown"
            /></span>
          </div>
          <div v-if="isBatchOp" class="tab" @click="selectAll">{{
            $t('contextMenu.selectAll')
          }}</div>
          <div v-if="isBatchOp" class="tab" @click="addToPlaylist">{{
            $t('contextMenu.addToLocalPlaylist')
          }}</div>
          <div
            v-else
            class="tab"
            :class="{ active: currentTab === 'localPlaylist' }"
            @click="updateTab('localPlaylist')"
          >
            {{ $t('localMusic.playlist') }}
          </div>
          <div v-if="isBatchOp" class="tab" @click="addTracksToQueue">{{
            $t('contextMenu.addToQueue')
          }}</div>
          <div
            v-else
            class="tab"
            :class="{ active: currentTab === 'album' }"
            @click="updateTab('album')"
          >
            {{ $t('localMusic.albums') }}
          </div>
          <div v-if="isBatchOp" class="tab" @click="finishBatchOp">{{
            $t('contextMenu.finish')
          }}</div>
          <div
            v-else
            class="tab"
            :class="{ active: currentTab === 'artist' }"
            @click="updateTab('artist')"
          >
            {{ $t('localMusic.artists') }}
          </div>
        </div>
        <div v-if="currentTab !== 'localPlaylist'" class="search-box">
          <SearchBox
            :placeholder="$t('localMusic.search')"
            @update:keywords="doFilter($event)"
          />
        </div>
        <button
          v-show="currentTab === 'localPlaylist'"
          class="tab-button"
          @click="openAddPlaylistModal"
          ><svg-icon icon-class="plus" />{{ $t('library.newPlayList') }}
        </button>
      </div>

      <div v-show="currentTab === 'localTracks'">
        <TrackList
          :id="0"
          ref="trackListRef"
          :tracks="sortedFilteredLocalTracks"
          :column-number="1"
          type="localPlaylist"
          :is-batch-op="isBatchOp"
          :extra-context-menu-item="[
            'showInFolder',
            'addToLocalList',
            'accurateMatch',
          ]"
        />
      </div>

      <div v-if="currentTab === 'localPlaylist'">
        <CoverRow
          :items="playlists"
          type="localPlaylist"
          :show-play-button="true"
        />
      </div>

      <div v-else-if="currentTab === 'album'">
        <CoverRow :items="albums" type="artist" :show-play-button="true" />
      </div>

      <div v-else-if="currentTab === 'artist'">
        <CoverRow :items="artists" type="artist" :show-play-button="true" />
      </div>
    </div>

    <ModalMatchTrack />

    <ContextMenu ref="localTracksTabMenu">
      <div class="item" @click="updateSortBy('default')">{{
        $t('contextMenu.defaultSort')
      }}</div>
      <div class="item" @click="updateSortBy('byname')">{{
        $t('contextMenu.sortByName')
      }}</div>
      <div class="item" @click="updateSortBy('descend')">{{
        $t('contextMenu.descendSort')
      }}</div>
      <div class="item" @click="updateSortBy('ascend')">{{
        $t('contextMenu.ascendSort')
      }}</div>
      <hr />
      <div v-if="!isBatchOp" class="item" @click="scanLocalMusic">{{
        $t('contextMenu.reScan')
      }}</div>
      <div v-if="!isBatchOp" class="item" @click="batchOpSwitch">{{
        $t('contextMenu.batchOperation')
      }}</div>
    </ContextMenu>
  </div>
</template>

<script>
import { mapState, mapMutations } from 'vuex';
import { randomNum } from '@/utils/common';
import { getLyric } from '@/api/track';
import { lyricParser } from '@/utils/lyrics';
import SvgIcon from '@/components/SvgIcon.vue';
import SearchBox from '@/components/SearchBox.vue';
import TrackList from '@/components/TrackList.vue';
import ContextMenu from '@/components/ContextMenu.vue';
import CoverRow from '@/components/VirtualCoverRow.vue';
import ModalMatchTrack from '@/components/ModalMatchTrack.vue';

const getRandomNumbersFromList = (list, count) => {
  const listCopy = list.slice();
  const result = [];

  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * listCopy.length);
    const randomNumber = listCopy[randomIndex];

    result.push(randomNumber);
    listCopy.splice(randomIndex, 1);
  }

  return result;
};

export default {
  name: 'LocalMusic',
  components: {
    TrackList,
    SvgIcon,
    ContextMenu,
    SearchBox,
    CoverRow,
    ModalMatchTrack,
  },
  data() {
    return {
      lyric: undefined,
      lyricSong: undefined,
      noLyricTracks: [],
      currentTab: 'localTracks',
      isBatchOp: false,
      searchKeyWords: '',
      randomTracks: [],
    };
  },
  computed: {
    ...mapState(['localMusic', 'modalOpen', 'settings']),
    localTracks() {
      if (!this.localMusic?.tracks) return [];
      return this.localMusic?.tracks?.map((track, index) => ({
        ...track,
        index,
      }));
    },
    playlists() {
      return this.localMusic?.playlists || [];
    },
    sortBy() {
      return this.localMusic?.sortBy || 'default';
    },
    artists() {
      if (!this.sortedFilteredLocalTracks) return [];
      const ar = this.sortedFilteredLocalTracks?.map(track => track.ar).flat();
      return [...new Map(ar.map(a => [a.name, a])).values()];
    },
    albums() {
      if (!this.sortedFilteredLocalTracks) return [];
      const al = this.sortedFilteredLocalTracks?.map(track => track.al);
      return [...new Map(al.map(a => [a.name, a])).values()];
    },
    pickedLyric() {
      /** @type {string?} */
      const lyric = this.lyric;

      // Returns [] if we got no lyrics.
      if (!lyric) return [];
      const filterWords =
        /(作词|作曲|编曲|和声|混音|录音|OP|SP|MV|吉他|二胡|古筝|曲编|键盘|贝斯|鼓|弦乐|打击乐|混音|制作人|配唱|提琴|海报|特别鸣谢)/i;
      const lyricLines = lyric
        ?.filter(l => !filterWords.test(l.content))
        ?.map(l => l.content);
      const lyricsToPick = Math.min(lyricLines.length, 3);
      const randomUpperBound = lyricLines.length - lyricsToPick;
      const startLyricLineIndex = randomNum(0, randomUpperBound - 1);
      const returnLyric = lyricLines?.slice(
        startLyricLineIndex,
        startLyricLineIndex + lyricsToPick
      );
      returnLyric.push(`————《${this.lyricSong.name}》`);
      return returnLyric;
    },
    sortedFilteredLocalTracks() {
      if (!this.filterLocalTracks) return [];
      return this.filterLocalTracks.slice().sort((a, b) => {
        if (this.sortBy === 'default') {
          return a.index - b.index;
        } else if (this.sortBy === 'ascend') {
          const timeA = new Date(a.createTime).getTime();
          const timeB = new Date(b.createTime).getTime();
          return timeA - timeB;
        } else if (this.sortBy === 'descend') {
          const timeA = new Date(a.createTime).getTime();
          const timeB = new Date(b.createTime).getTime();
          return timeB - timeA;
        } else {
          return a.name.localeCompare(b.name, 'zh-CN', { numeric: true });
        }
      });
    },
    filterLocalTracks() {
      if (!this.localTracks) return [];
      return this.localTracks?.filter(
        track =>
          (track.name &&
            track.name
              .toLowerCase()
              .includes(this.searchKeyWords.toLowerCase())) ||
          (track.al?.name &&
            track.al.name
              .toLowerCase()
              .includes(this.searchKeyWords.toLowerCase())) ||
          track.ar.find(
            a =>
              a.name &&
              a.name.toLowerCase().includes(this.searchKeyWords.toLowerCase())
          )
      );
    },
  },
  watch: {
    modalOpen(val) {
      if (!val) {
        this.isBatchOp = false;
      }
    },
  },
  mounted() {
    this.getRandomLyric();
    this.getShowTracks();
  },
  methods: {
    ...mapMutations(['updateSortBy', 'updateModal']),
    async getRandomLyric() {
      if (!this.localTracks.length) return;
      const randomTrack = this.localTracks?.filter(
        t => !this.noLyricTracks.includes(t)
      )[randomNum(0, this.localTracks?.length - 1)];
      const data = await this.getLyricFn(randomTrack);
      if (data && !data.lrc?.lyric?.length) {
        this.noLyricTracks.push(randomTrack);
        this.getRandomLyric();
        return;
      }
      if (!data) {
        this.getRandomLyric();
        return;
      } else {
        const { lyric } = lyricParser(data);
        const isInstrumental = lyric?.filter(l =>
          l.content?.includes('纯音乐，请欣赏')
        );
        if (isInstrumental?.length) {
          this.noLyricTracks.push(randomTrack);
          this.getRandomLyric();
          return;
        }
        this.lyric = lyric;
        this.lyricSong = randomTrack;
      }
    },
    getShowTracks() {
      if (!this.localTracks) return;
      this.randomTracks =
        this.localTracks?.length > 12
          ? getRandomNumbersFromList(this.localTracks, 12)
          : this.localTracks;
    },
    async getLyricFn(track) {
      if (!track) return;
      const fnPools = [];
      let data = {
        lrc: { lyric: [] },
        tlyric: { lyric: [] },
        rlyric: { lyric: [] },
      };
      if (track.matched) {
        fnPools.push([getLyric, track.id]);
      }
      fnPools.push([this.getInnerLyric, track.filePath]);
      let [lyricFn, param] = fnPools.shift();
      data = await lyricFn(param);
      if (!data?.lrc?.lyric && fnPools.length) {
        [lyricFn, param] = fnPools.shift();
        data = await lyricFn(param);
      }
      return data;
    },
    async getInnerLyric(filePath) {
      const data = await fetch(`atom://get-lyric/${filePath}`)
        .then(res => res.json())
        .catch(() => null);
      return data;
    },
    playThisTrack() {},
    updateTab(tab) {
      this.currentTab = tab;
    },
    openLocalTracksTabMenu(e) {
      this.$refs.localTracksTabMenu.openMenu(e);
    },
    doFilter(keywords) {
      this.searchKeyWords = keywords;
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
    selectAll() {
      this.$refs.trackListRef?.selectAll();
    },
    addToPlaylist() {
      this.$refs.trackListRef.addTrack2LocalPlaylist();
    },
    addTracksToQueue() {
      this.$refs.trackListRef.addToQueue();
    },
    finishBatchOp() {
      this.isBatchOp = false;
      this.$refs.trackListRef?.doFinish();
    },
    scrollTo(top, behavior = 'smooth') {
      this.$parent.$refs.main.scrollTo({ top, behavior });
    },
    batchOpSwitch() {
      this.currentTab = 'localTracks';
      this.isBatchOp = true;
    },
    scanLocalMusic() {
      const render = require('electron').ipcRenderer;
      render.send('currentLocalMusic', this.localTracks);
      render.send('msgScanLocalMusic', this.settings.localMusicFolderPath);
    },
  },
};
</script>

<style lang="scss" scoped>
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
  align-items: center;
  margin-bottom: 24px;
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
  padding: 10px 14px;
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

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

    <h1 v-if="!settings.localMusicFolderPath">请设置本地歌曲路径</h1>

    <div v-else class="section-two">
      <div class="tabs-row">
        <div class="tabs">
          <div
            class="tab dropdown"
            :class="{ active: currentTab === 'localSongs' }"
            @click="updateCurrentTab('localSongs')"
          >
            <span class="text">{{
              {
                all: $t('contextMenu.localMusic'),
              }[playlistFilter]
            }}</span>
            <span class="icon" @click.stop="openPlaylistTabMenu"
              ><svg-icon icon-class="dropdown"
            /></span>
          </div>
          <div
            class="tab"
            :class="{ active: currentTab === 'playlist' }"
            @click="updateCurrentTab('playlist')"
          >
            {{ $t('localMusic.playlist') }}
          </div>
          <div
            class="tab"
            :class="{ active: currentTab === 'albums' }"
            @click="updateCurrentTab('albums')"
          >
            {{ $t('library.albums') }}
          </div>
          <div
            class="tab"
            :class="{ active: currentTab === 'artists' }"
            @click="updateCurrentTab('artists')"
          >
            {{ $t('library.artists') }}
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
        <div v-if="localMusic.songs.length > 1">
          <LocalTrackList
            :tracks="localMusic.songs"
            :column-number="1"
            type="localtracks"
          />
        </div>
      </div>

      <div v-show="currentTab === 'playlists'">
        <div v-if="localMusic.playlists.length > 1">
          <CoverRow
            :items="filterPlaylists"
            type="playlist"
            sub-text="creator"
            :show-play-button="true"
          />
        </div>
      </div>

      <div v-show="currentTab === 'albums'">
        <CoverRow
          :items="localMusic.albums"
          type="album"
          sub-text="artist"
          :show-play-button="true"
        />
      </div>

      <div v-show="currentTab === 'artists'">
        <CoverRow
          :items="localMusic.artists"
          type="artist"
          :show-play-button="true"
        />
      </div>
    </div>

    <ContextMenu ref="playlistTabMenu">
      <div class="item" @click="changePlaylistFilter('descend')">{{
        $t('contextMenu.descendSort')
      }}</div>
      <div class="item" @click="changePlaylistFilter('ascend')">{{
        $t('contextMenu.ascendSort')
      }}</div>
      <div class="item" @click="changePlaylistFilter('byname')">{{
        $t('contextMenu.sortByName')
      }}</div>
    </ContextMenu>

    <ContextMenu ref="playModeTabMenu">
      <div class="item">{{ $t('library.likedSongs') }}</div>
      <hr />
      <div class="item">{{ $t('contextMenu.cardiacMode') }}</div>
    </ContextMenu>
  </div>
</template>

<script>
import { mapState, mapMutations } from 'vuex';
// import { isAccountLoggedIn } from '@/utils/auth';
// import locale from '@/locale';
// import { getLyric } from '@/api/track';
// import NProgress from 'nprogress';
import LocalTrackList from '@/components/LocalTrackList.vue';

import ContextMenu from '@/components/ContextMenu.vue';
import CoverRow from '@/components/CoverRow.vue';
import SvgIcon from '@/components/SvgIcon.vue';

export default {
  name: 'LocalMusic',
  components: { SvgIcon, CoverRow, ContextMenu, LocalTrackList },
  data() {
    return {
      show: true,
      likedSongs: [],
      lyric: undefined,
      currentTab: 'localSongs',
      playHistoryMode: 'week',
    };
  },
  computed: {
    ...mapState(['data', 'localMusic', 'settings']),
    playlistFilter() {
      return this.data.libraryPlaylistFilter || 'all';
    },
    filterPlaylists() {
      const playlists = this.localMusic.songs;
      const userId = this.data.user.userId;
      if (this.playlistFilter === 'mine') {
        return playlists.filter(p => p.creator.userId === userId);
      } else if (this.playlistFilter === 'liked') {
        return playlists.filter(p => p.creator.userId !== userId);
      }
      return playlists;
    },
  },
  created() {},
  methods: {
    ...mapMutations(['updateData']),
    updateCurrentTab(tab) {
      this.currentTab = tab;
      this.$parent.$refs.main.scrollTo({ top: 375, behavior: 'smooth' });
    },
    openAddPlaylistModal() {
      this.updateModal({
        modalName: 'newPlaylistModal',
        key: 'show',
        value: true,
      });
    },
    openPlaylistTabMenu(e) {
      this.$refs.playlistTabMenu.openMenu(e);
    },
    openPlayModeTabMenu(e) {
      this.$refs.playModeTabMenu.openMenu(e);
    },
    changePlaylistFilter(type) {
      console.log('type = ', type);
      // this.updateData({ key: 'libraryPlaylistFilter', value: type });
      window.scrollTo({ top: 375, behavior: 'smooth' });
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
    font-size: 14px;
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
</style>

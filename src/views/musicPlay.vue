<template>
  <div>
    <transition name="slide-up">
      <div
        v-show="showLyrics"
        ref="main"
        class="lyrics-page"
        :class="{ 'no-lyric': noLyric }"
        :data-theme="theme"
      >
        <div
          v-if="
            (settings.lyricsBackground === 'blur') |
              (settings.lyricsBackground === 'dynamic')
          "
          class="lyrics-background"
          :class="{
            'dynamic-background': settings.lyricsBackground === 'dynamic',
          }"
        >
          <div
            class="top-right"
            :style="{ backgroundImage: `url(${bgImageUrl})` }"
          />
          <div
            class="bottom-left"
            :style="{ backgroundImage: `url(${bgImageUrl})` }"
          />
        </div>
        <div
          v-if="settings.lyricsBackground === true"
          class="gradient-background"
          :style="{ background }"
        ></div>
        <div class="left-side">
          <div>
            <div v-if="settings.showLyricsTime" class="date">
              {{ date }}
            </div>
            <div class="cover">
              <div class="cover-container">
                <img :src="imageUrl" loading="lazy" />
                <div
                  class="shadow"
                  :style="{ backgroundImage: `url(${imageUrl})` }"
                ></div>
              </div>
            </div>
            <div class="controls">
              <div class="top-part">
                <div class="track-info">
                  <div class="title" :title="currentTrack.name">
                    <router-link
                      v-if="hasList()"
                      :to="`${getListPath()}`"
                      @click.native="closePlayPage"
                      >{{ currentTrack.name }}
                    </router-link>
                    <span v-else>
                      {{ currentTrack.name }}
                    </span>
                  </div>
                  <div class="subtitle">
                    <router-link
                      v-if="artist.id !== 0"
                      :to="`/artist/${artist.id}`"
                      @click.native="closePlayPage"
                      >{{ artist.name }}
                    </router-link>
                    <span v-else>
                      {{ artist.name }}
                    </span>
                    <span v-if="album.id !== 0">
                      -
                      <router-link
                        :to="`/album/${album.id}`"
                        :title="album.name"
                        @click.native="closePlayPage"
                        >{{ album.name }}
                      </router-link>
                    </span>
                  </div>
                </div>
                <div class="top-right">
                  <div class="volume-control">
                    <button-icon
                      :title="$t('player.mute')"
                      @click.native="mute"
                    >
                      <svg-icon v-show="volume > 0.5" icon-class="volume" />
                      <svg-icon
                        v-show="volume === 0"
                        icon-class="volume-mute"
                      />
                      <svg-icon
                        v-show="volume <= 0.5 && volume !== 0"
                        icon-class="volume-half"
                      />
                    </button-icon>
                    <div class="volume-bar">
                      <vue-slider
                        v-model="volume"
                        :min="0"
                        :max="1"
                        :interval="0.01"
                        :drag-on-click="true"
                        :duration="0"
                        tooltip="none"
                        :dot-size="12"
                      ></vue-slider>
                    </div>
                  </div>
                  <div class="buttons">
                    <button-icon
                      :title="$t('player.like')"
                      @click.native="likeATrack(player.currentTrack.id)"
                    >
                      <svg-icon
                        :icon-class="
                          player.isCurrentTrackLiked ? 'heart-solid' : 'heart'
                        "
                      />
                    </button-icon>
                    <button-icon
                      :title="$t('contextMenu.addToPlaylist')"
                      @click.native="addToPlaylist(isLocal)"
                    >
                      <svg-icon icon-class="plus" />
                    </button-icon>
                    <button-icon
                      class="lyric_comment_btn"
                      :title="
                        $t(
                          show === 'lyric'
                            ? 'contextMenu.showComment'
                            : 'contextMenu.showLyric'
                        )
                      "
                      @click.native="
                        switchCommentAndLyric(
                          show === 'lyric' ? 'comment' : 'lyric'
                        )
                      "
                    >
                      <svg-icon v-if="show === 'lyric'" icon-class="comment" />
                      <svg-icon v-else icon-class="lyric" />
                    </button-icon>
                    <button-icon
                      :title="$t('contextMenu.operationOption')"
                      @click.native="openMenu"
                    >
                      <svg-icon icon-class="options" />
                    </button-icon>
                  </div>
                </div>
              </div>
              <div class="progress-bar">
                <span>{{ formatTrackTime(player.progress) || '0:00' }}</span>
                <div class="slider">
                  <vue-slider
                    v-model="player.progress"
                    :min="0"
                    :max="player.currentTrackDuration"
                    :interval="1"
                    :drag-on-click="true"
                    :duration="0"
                    :dot-size="12"
                    :height="2"
                    :tooltip-formatter="formatTrackTime"
                    :lazy="true"
                    :silent="true"
                  ></vue-slider>
                </div>
                <span>{{ formatTrackTime(player.currentTrackDuration) }}</span>
              </div>
              <div class="media-controls">
                <button-icon
                  v-show="!player.isPersonalFM"
                  :title="
                    player.repeatMode === 'one'
                      ? $t('player.repeatTrack')
                      : $t('player.repeat')
                  "
                  :class="{ active: player.repeatMode !== 'off' }"
                  @click.native="switchRepeatMode"
                >
                  <svg-icon
                    v-show="player.repeatMode !== 'one'"
                    icon-class="repeat"
                  />
                  <svg-icon
                    v-show="player.repeatMode === 'one'"
                    icon-class="repeat-1"
                  />
                </button-icon>
                <div class="middle">
                  <button-icon
                    v-show="!player.isPersonalFM"
                    :title="$t('player.previous')"
                    @click.native="playPrevTrack"
                  >
                    <svg-icon icon-class="previous" />
                  </button-icon>
                  <button-icon
                    v-show="player.isPersonalFM"
                    title="不喜欢"
                    @click.native="moveToFMTrash"
                  >
                    <svg-icon icon-class="thumbs-down" />
                  </button-icon>
                  <button-icon
                    id="play"
                    :title="$t(player.playing ? 'player.pause' : 'player.play')"
                    @click.native="playOrPause"
                  >
                    <svg-icon :icon-class="player.playing ? 'pause' : 'play'" />
                  </button-icon>
                  <button-icon
                    :title="$t('player.next')"
                    @click.native="playNextTrack"
                  >
                    <svg-icon icon-class="next" />
                  </button-icon>
                </div>
                <button-icon
                  v-show="!player.isPersonalFM"
                  :title="$t('player.shuffle')"
                  :class="{ active: player.shuffle }"
                  @click.native="switchShuffle"
                >
                  <svg-icon icon-class="shuffle" />
                </button-icon>
                <span v-show="showTranIcon" class="transPro" @click="switchRbT">
                  <label
                    v-if="hasTLyric"
                    :class="{
                      activeTag: settings.showLyricsTranslation === 'tlyric',
                    }"
                    >译</label
                  >
                  <label v-if="hasTLyric && hasRLyric" class="m-label">|</label>
                  <label
                    v-if="hasRLyric"
                    :class="{
                      activeTag: settings.showLyricsTranslation === 'rlyric',
                    }"
                    >音</label
                  >
                </span>
              </div>
            </div>
          </div>
        </div>
        <div class="right-side">
          <Lyrics v-show="show === 'lyric'" ref="lyricRef" />
          <component
            :is="
              show === 'comment' || show === 'floor_comment' ? 'comment' : null
            "
            ref="commentRef"
          />
          <!-- <Comment v-show="show === 'comment'" ref="commentRef" /> -->
          <CommentFloor v-if="show === 'floor_comment'" ref="floorRef" />
        </div>
        <div class="close-button" @click="closePlayPage">
          <button>
            <svg-icon icon-class="arrow-down" />
          </button>
        </div>
      </div>
    </transition>
    <div>
      <ModalDeleteComment />
      <ModalSetLyricDelay />
      <ModalSetRate />
      <ContextMenu ref="playPageMenu" class="contextMenu">
        <div ref="lyricDelay" class="item" @click="changeLyricTime">{{
          $t('contextMenu.changeLyricTime')
        }}</div>
        <div ref="playBack" class="item" @click="setRate">{{
          $t('contextMenu.playBackSpeed')
        }}</div>
        <div
          v-if="isLocal"
          ref="playBack"
          class="item"
          @click="addToPlaylist(false)"
          >{{ $t('contextMenu.addToPlaylist') }}</div
        >
      </ContextMenu>
    </div>
  </div>
</template>

<script>
// The lyrics page of Apple Music is so gorgeous, so I copy the design.
// Some of the codes are from https://github.com/sl1673495/vue-netease-music
import Vue from 'vue';
import { mapState, mapMutations, mapActions } from 'vuex';
import { formatTrackTime, changeAppearance } from '@/utils/common';
import VueSlider from 'vue-slider-component';
import ButtonIcon from '@/components/ButtonIcon.vue';
import * as Vibrant from 'node-vibrant/dist/vibrant.worker.min.js';
import Color from 'color';
import { isAccountLoggedIn } from '@/utils/auth';
import Lyrics from '@/views/lyrics.vue';
import Comment from '@/views/comment.vue';
import { hasListSource, getListSourcePath } from '@/utils/playList';
import locale from '@/locale';
import CommentFloor from '@/views/commentFloor.vue';
import ModalDeleteComment from '@/components/ModalDeleteComment.vue';
import ModalSetLyricDelay from '@/components/ModalSetLyricDelay.vue';
import ModalSetRate from '@/components/ModalSetRate.vue';
import ContextMenu from '@/components/ContextMenu.vue';

export default {
  name: 'MusicPlay',
  components: {
    VueSlider,
    ButtonIcon,
    Lyrics,
    Comment,
    CommentFloor,
    ContextMenu,
    ModalDeleteComment,
    ModalSetLyricDelay,
    ModalSetRate,
  },
  data() {
    return {
      show: 'lyric',
      commentId: null,
      type: 0,
      background: '',
      date: this.formatTime(new Date()),
      hasLyric: true,
      hasTLyric: false,
      hasRLyric: false,
      idx: 0,
    };
  },
  computed: {
    ...mapState(['player', 'settings', 'showLyrics', 'modals']),
    currentTrack: {
      get() {
        return this.player.currentTrack;
      },
      set() {},
    },
    showTranIcon() {
      return this.hasTLyric || this.hasRLyric;
    },
    tags() {
      const lst = ['off'];
      if (this.hasTLyric) {
        lst.splice(1, 0, 'tlyric');
      }
      if (this.hasRLyric) {
        lst.push('rlyric');
      }
      return lst;
    },
    tagIdx() {
      let idx = this.tags.indexOf(this.settings.showLyricsTranslation);
      idx === -1 ? (idx = 0) : idx;
      return idx;
    },
    isLocal() {
      return this.player.currentTrack.isLocal === true;
    },
    volume: {
      get() {
        return this.player.volume;
      },
      set(value) {
        this.player.volume = value;
      },
    },
    imageUrl() {
      return this.player.currentTrack?.al?.picUrl + '?param=1024y1024';
    },
    bgImageUrl() {
      return this.player.currentTrack?.al?.picUrl + '?param=512y512';
    },
    artist() {
      return this.currentTrack?.ar
        ? this.currentTrack.ar[0]
        : { id: 0, name: 'unknown' };
    },
    album() {
      return this.currentTrack?.al || { id: 0, name: 'unknown' };
    },
    theme() {
      return this.settings.lyricsBackground === true ? 'dark' : 'auto';
    },
    noLyric() {
      return !this.hasLyric && this.show === 'lyric';
    },
  },
  watch: {
    'player.currentTrack': function (newVal, oldVal) {
      if (newVal !== oldVal) {
        this.currentTrack = newVal;
      }
    },
    currentTrack() {
      this.getCoverColor();
    },
    tagIdx(val) {
      this.idx = val;
    },
  },
  created() {
    this.Bus = new Vue();
    this.Bus.$on('showFloors', async data => {
      if (data.show === 'floor_comment') {
        this.commentId = data.commentId;
        this.switchCommentAndLyric(data.show);
      }
    });
    this.Bus.$on('showComment', data => {
      this.switchCommentAndLyric(data);
    });
    this.getCoverColor();
    this.initDate();
  },
  beforeDestroy: function () {
    this.settings.appearance = this.appearance;
    changeAppearance(this.appearance);
    if (this.timer) {
      clearInterval(this.timer);
    }
  },
  methods: {
    ...mapMutations(['toggleLyrics', 'updateModal', 'setDelayTime']),
    ...mapActions(['likeATrack', 'showToast']),
    initDate() {
      var _this = this;
      clearInterval(this.timer);
      this.timer = setInterval(function () {
        _this.date = _this.formatTime(new Date());
      }, 1000);
    },
    switchRbT() {
      this.idx = (this.idx + 1) % this.tags.length;
      const value = this.tags[this.idx];
      this.$store.commit('updateSettings', {
        key: 'showLyricsTranslation',
        value,
      });
    },
    closePlayPage() {
      this.toggleLyrics();
      this.show = 'lyric';
    },
    openMenu(e) {
      this.$refs.playPageMenu.openMenu(e);
    },
    formatTime(value) {
      let hour = value.getHours().toString();
      let minute = value.getMinutes().toString();
      let second = value.getSeconds().toString();
      return (
        hour.padStart(2, '0') +
        ':' +
        minute.padStart(2, '0') +
        ':' +
        second.padStart(2, '0')
      );
    },
    switchCommentAndLyric(show_option) {
      this.show = show_option;
    },
    addToPlaylist(isLocal = false) {
      let id = this.currentTrack.id;
      if (isLocal) {
        const localMusic = this.$store.state.localMusic;
        const track = localMusic.tracks.find(t => t.onlineTrack.id === id);
        if (!track) return;
        id = [track.id];
        this.updateModal({
          modalName: 'addTrackToPlaylistModal',
          key: 'isLocal',
          value: true,
        });
      } else {
        if (!isAccountLoggedIn()) {
          this.showToast(locale.t('toast.needToLogin'));
          return;
        }
        this.$store.dispatch('fetchLikedPlaylist');
      }
      this.updateModal({
        modalName: 'addTrackToPlaylistModal',
        key: 'show',
        value: true,
      });
      this.updateModal({
        modalName: 'addTrackToPlaylistModal',
        key: 'selectedTrackID',
        value: id,
      });
    },
    changeLyricTime() {
      this.updateModal({
        modalName: 'setLyricDelayModal',
        key: 'show',
        value: true,
      });
    },
    setRate() {
      this.updateModal({
        modalName: 'setPlayBackRate',
        key: 'show',
        value: true,
      });
    },
    playPrevTrack() {
      this.player.playPrevTrack();
    },
    playOrPause() {
      this.player.playOrPause();
    },
    playNextTrack() {
      if (this.player.isPersonalFM) {
        this.player.playNextFMTrack();
      } else {
        this.player.playNextTrack();
      }
    },
    formatTrackTime(value) {
      return formatTrackTime(value);
    },
    moveToFMTrash() {
      this.player.moveToFMTrash();
    },
    switchRepeatMode() {
      this.player.switchRepeatMode();
    },
    switchShuffle() {
      this.player.switchShuffle();
    },
    getCoverColor() {
      if (this.settings.lyricsBackground !== true) return;
      const cover = this.currentTrack?.al?.picUrl + '?param=256y256';
      Vibrant.from(cover, { colorCount: 1 })
        .getPalette()
        .then(palette => {
          const originColor = Color.rgb(palette.DarkMuted._rgb);
          const color = originColor.darken(0.1).rgb().string();
          const color2 = originColor.lighten(0.28).rotate(-30).rgb().string();
          this.background = `linear-gradient(to top left, ${color}, ${color2})`;
        });
    },
    hasList() {
      return hasListSource();
    },
    getListPath() {
      return getListSourcePath();
    },
    mute() {
      this.player.mute();
    },
  },
};
</script>

<style lang="scss" scoped>
.lyrics-page {
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  bottom: 0;
  z-index: 200;
  background: var(--color-body-bg);
  display: flex;
  clip: rect(auto, auto, auto, auto);
}

.lyrics-background {
  --contrast-lyrics-background: 75%;
  --brightness-lyrics-background: 150%;
}

[data-theme='dark'] .lyrics-background {
  --contrast-lyrics-background: 125%;
  --brightness-lyrics-background: 50%;
}

.lyrics-background {
  filter: blur(50px) contrast(var(--contrast-lyrics-background))
    brightness(var(--brightness-lyrics-background));
  position: absolute;
  height: 100vh;
  width: 100vw;
  .top-right,
  .bottom-left {
    z-index: 0;
    width: 140vw;
    height: 140vw;
    opacity: 0.6;
    position: absolute;
    background-size: cover;
  }

  .top-right {
    right: 0;
    top: 0;
    mix-blend-mode: luminosity;
  }

  .bottom-left {
    left: 0;
    bottom: 0;
    animation-direction: reverse;
    animation-delay: 10s;
  }
}

.dynamic-background > div {
  animation: rotate 150s linear infinite;
}

@keyframes rotate {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.gradient-background {
  position: absolute;
  height: 100vh;
  width: 100vw;
}

.left-side {
  flex: 1;
  display: flex;
  justify-content: flex-end;
  margin-right: 80px;
  margin-top: 24px;
  width: 50vw;
  align-items: center;
  transition: all 0.5s;
  z-index: 50;

  .date {
    max-width: 54vh;
    margin: 24px 0;
    color: var(--color-text);
    text-align: center;
    font-size: 4rem;
    font-weight: 600;
    opacity: 0.88;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
    overflow: hidden;
  }

  .controls {
    max-width: 54vh;
    margin-top: 24px;
    color: var(--color-text);
    position: relative;

    .title {
      margin-top: 8px;
      font-size: 1.4rem;
      font-weight: 600;
      opacity: 0.88;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 1;
      overflow: hidden;
    }

    .subtitle {
      margin-top: 4px;
      font-size: 1rem;
      opacity: 0.58;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 1;
      overflow: hidden;
    }

    .top-part {
      display: flex;
      justify-content: space-between;

      .top-right {
        display: flex;
        justify-content: space-between;

        .volume-control {
          margin: 0 10px;
          display: flex;
          align-items: center;
          .volume-bar {
            width: 84px;
          }
        }

        .buttons {
          display: flex;
          align-items: center;

          button {
            margin: 0 0 0 4px;
          }

          .svg-icon {
            height: 18px;
            width: 18px;
          }
        }

        .lyric_comment_btn {
          .svg-icon {
            height: 25px;
            width: 25px;
          }
        }
      }
    }

    .progress-bar {
      margin-top: 22px;
      display: flex;
      align-items: center;
      justify-content: space-between;

      .slider {
        width: 100%;
        flex-grow: grow;
        padding: 0 10px;
      }

      span {
        font-size: 15px;
        opacity: 0.58;
        min-width: 28px;
      }
    }

    .transPro {
      font-size: 1.2rem;
      color: var(--color-text);
      margin-left: 20px;
      user-select: none;

      :hover {
        cursor: pointer;
      }

      label {
        opacity: 0.38;
      }

      .activeTag {
        opacity: 0.88;
      }

      .m-label {
        padding: 0 2px;
      }
    }

    .media-controls {
      display: flex;
      justify-content: center;
      margin-top: 18px;
      align-items: center;

      button {
        margin: 0;
      }

      .svg-icon {
        opacity: 0.38;
        height: 14px;
        width: 14px;
      }

      .active .svg-icon {
        opacity: 0.88;
      }

      .middle {
        padding: 0 16px;
        display: flex;
        align-items: center;

        button {
          margin: 0 8px;
        }

        button#play .svg-icon {
          height: 28px;
          width: 28px;
          padding: 2px;
        }

        .svg-icon {
          opacity: 0.88;
          height: 22px;
          width: 22px;
        }
      }
    }
  }
}

.cover {
  position: relative;

  .cover-container {
    position: relative;
  }

  img {
    border-radius: 0.75em;
    width: 54vh;
    height: 54vh;
    user-select: none;
    object-fit: cover;
  }

  .shadow {
    position: absolute;
    top: 12px;
    height: 54vh;
    width: 54vh;
    filter: blur(16px) opacity(0.6);
    transform: scale(0.92, 0.96);
    z-index: -1;
    background-size: cover;
    border-radius: 0.75em;
  }
}

#comment-box {
  display: none;
  // background-color: red;
}

// #lyrics {
//   display: none;
// }

.right-side {
  flex: 1;
  font-weight: 600;
  color: var(--color-text);
  margin-right: 24px;
  z-index: 0;

  ::-webkit-scrollbar {
    display: none;
  }
}

.close-button {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 300;
  border-radius: 0.75rem;
  height: 44px;
  width: 44px;
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0.28;
  transition: 0.2s;
  -webkit-app-region: no-drag;

  .svg-icon {
    color: var(--color-text);
    padding-top: 5px;
    height: 22px;
    width: 22px;
  }

  &:hover {
    background: var(--color-secondary-bg-for-transparent);
    opacity: 0.88;
  }
}

.lyrics-page.no-lyric {
  .left-side {
    transition: all 0.5s;
    transform: translateX(27vh);
    margin-right: 0;
  }
}

@media (max-aspect-ratio: 10/9) {
  .left-side {
    display: none;
  }
  .right-side {
    max-width: 100%;
  }
}

@media screen and (min-width: 1200px) {
  .right-side .lyrics-container {
    max-width: 600px;
  }
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.4s;
}

.slide-up-enter,
.slide-up-leave-to {
  transform: translateY(100%);
}
</style>

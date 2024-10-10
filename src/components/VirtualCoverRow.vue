<template>
  <VirtualScroll
    :list="items"
    :gap="gap"
    :item-size="itemHeight"
    :above-value="1"
    :below-value="1"
    :column-number="columnNumber"
  >
    <template #default="{ item }">
      <div
        class="item"
        :style="{ height: itemHeight + 'px' }"
        :class="{ artist: type === 'artist' }"
      >
        <Cover
          :id="item.id"
          :image-url="getImageUrl(item)"
          :matched="item.matched"
          :type="type"
          :play-button-size="type === 'artist' ? 26 : playButtonSize"
        />
        <div class="text">
          <div v-if="showPlayCount" class="info">
            <span class="play-count"
              ><svg-icon icon-class="play" />{{
                item.playCount | formatPlayCount
              }}
            </span>
          </div>
          <div class="title" :style="{ fontSize: subTextFontSize }">
            <span v-if="isExplicit(item)" class="explicit-symbol"
              ><ExplicitSymbol
            /></span>
            <span v-if="isPrivacy(item)" class="lock-icon">
              <svg-icon icon-class="lock"
            /></span>
            <router-link v-if="item.matched" :to="getTitleLink(item)">{{
              item.name
            }}</router-link>
            <span v-else>{{ item.name }}</span>
          </div>
          <div v-if="type !== 'artist' && subText !== 'none'" class="info">
            <span v-html="getSubText(item)"></span>
          </div>
        </div>
      </div>
    </template>
  </VirtualScroll>
</template>

<script>
import { mapState } from 'vuex';
import Cover from '@/components/Cover.vue';
import ExplicitSymbol from '@/components/ExplicitSymbol.vue';
import VirtualScroll from '@/components/VirtualScroll.vue';

export default {
  name: 'VirtualCoverRow',
  components: {
    Cover,
    VirtualScroll,
    ExplicitSymbol,
  },
  props: {
    items: { type: Array, required: true },
    type: { type: String, required: true },
    subText: { type: String, default: 'null' },
    subTextFontSize: { type: String, default: '16px' },
    showPlayCount: { type: Boolean, default: false },
    itemHeight: { type: Number, default: 260 },
    columnNumber: { type: Number, default: 5 },
    gap: { type: Number, default: 20 },
    playButtonSize: { type: Number, default: 22 },
  },
  computed: {
    ...mapState(['localMusic']),
  },
  methods: {
    getSubText(item) {
      if (this.subText === 'copywriter') return item.copywriter;
      if (this.subText === 'description') return item.description;
      if (this.subText === 'updateFrequency') return item.updateFrequency;
      if (this.subText === 'creator') return 'by ' + item.creator.nickname;
      if (this.subText === 'releaseYear')
        return new Date(item.publishTime).getFullYear();
      if (this.subText === 'artist') {
        if (item.matched) {
          if (item.artist !== undefined)
            return `<a href="/#/artist/${item.artist.id}">${item.artist.name}</a>`;
          if (item.artists !== undefined)
            return `<a href="/#/artist/${item.artists[0].id}">${item.artists[0].name}</a>`;
        } else {
          if (item.artist !== undefined) {
            return item.artist.name;
          }
          if (item.artists !== undefined) {
            return item.artists[0].name;
          }
        }
      }
      if (this.subText === 'albumType+releaseYear') {
        let albumType = item.type;
        if (item.type === 'EP/Single') {
          albumType = item.size === 1 ? 'Single' : 'EP';
        } else if (item.type === 'Single') {
          albumType = 'Single';
        } else if (item.type === '专辑') {
          albumType = 'Album';
        }
        return `${albumType} · ${new Date(item.publishTime).getFullYear()}`;
      }
      if (this.subText === 'appleMusic') return 'by Apple Music';
    },
    isPrivacy(item) {
      return this.type === 'playlist' && item.privacy === 10;
    },
    isExplicit(item) {
      return this.type === 'album' && item.mark === 1056768;
    },
    getTitleLink(item) {
      return `/${this.type}/${item.id}`;
    },
    getImageUrl(item) {
      if (!item.matched && this.type === 'album') {
        const track = this.localMusic.tracks.find(
          t => t.al?.name === item.name
        );
        return `atom://get-pic/${track.filePath}`;
      }
      if (item.img1v1Url) {
        let img1v1ID = item.img1v1Url.split('/');
        img1v1ID = img1v1ID[img1v1ID.length - 1];
        if (img1v1ID === '5639395138885805.jpg') {
          // 没有头像的歌手，网易云返回的img1v1Url并不是正方形的 😅😅😅
          return 'https://p2.music.126.net/VnZiScyynLG7atLIZ2YPkw==/18686200114669622.jpg?param=512y512';
        }
      }
      let img = item.img1v1Url || item.picUrl || item.coverImgUrl;
      return `${img?.replace('http://', 'https://')}?param=512y512`;
    },
    scrollTo(top, behavior = 'smooth') {
      this.$parent.scrollTo(top, behavior);
    },
  },
};
</script>

<style lang="scss" scoped>
.item {
  color: var(--color-text);
  .text {
    margin-top: 8px;
    .title {
      font-size: 16px;
      font-weight: 600;
      line-height: 20px;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow: hidden;
      word-break: break-all;
    }
    .info {
      font-size: 12px;
      opacity: 0.68;
      line-height: 18px;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow: hidden;
      word-break: break-word;
    }
  }
}

.item.artist {
  display: flex;
  flex-direction: column;
  text-align: center;
  .cover {
    display: flex;
  }
  .title {
    margin-top: 4px;
  }
}

@media (max-width: 834px) {
  .item .text .title {
    font-size: 14px;
  }
}

.explicit-symbol {
  opacity: 0.28;
  color: var(--color-text);
  float: right;
  .svg-icon {
    margin-bottom: -3px;
  }
}

.lock-icon {
  opacity: 0.28;
  color: var(--color-text);
  margin-right: 4px;
  // float: right;
  .svg-icon {
    height: 12px;
    width: 12px;
  }
}

.play-count {
  font-weight: 600;
  opacity: 0.58;
  color: var(--color-text);
  font-size: 12px;
  .svg-icon {
    margin-right: 3px;
    height: 8px;
    width: 8px;
  }
}
</style>

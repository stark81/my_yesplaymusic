<template>
  <div
    ref="listRef"
    class="virtual-scroll"
    :style="{ height: containerHeight + 'px' }"
    @scroll="scrollEvent"
  >
    <div v-if="showPosition" class="position">
      <div
        v-show="currentTrack && showScrollTo"
        @click="scrollToCurrentTrack"
        >{{ $t('localMusic.positionTrack') }}</div
      >
      <div @click="scrollToTop">{{ $t('localMusic.scrollToTop') }}</div>
    </div>
    <div
      class="infinite-list-phantom"
      :style="{ height: `${listHeight}px` }"
    ></div>
    <div ref="contentRef" class="infinite-list" :style="listStyles">
      <div
        v-for="item in visibleData"
        :id="item._key"
        ref="itemsRef"
        :key="item._key"
      >
        <div class="infinite-item">
          <slot name="default" :index="item._key" :item="item.value"></slot>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapMutations, mapActions } from 'vuex';

export default {
  name: 'VirtualScroll',
  props: {
    list: { type: Array, default: () => [] },
    type: { type: String, default: 'tracklist' },
    styleBefore: { type: String, default: '' },
    paddingBottom: { type: Number, default: 64 },
    showPosition: { type: Boolean, default: true },
    pid: { type: Number, default: 0 },
    columnNumber: { type: Number, default: 1 },
    aboveValue: { type: Number, default: 5 },
    belowValue: { type: Number, default: 5 },
    gap: { type: Number, default: 4 },
    itemSize: { type: Number, default: 64 },
    enabled: { type: Boolean, default: true },
    propsHeight: { type: Number, default: 656 },
    extraContextMenuItem: { type: Array, default: () => [] },
  },
  data() {
    return {
      screenHeight: 0,
      start: 0,
      startOffset: 0,
      position: [],
      oneHeight: 0,
      lastScrollTop: 0,
      scrollTop: 0,
      lastContainerTop: 0,
      aber: null,
      toBottom: false,
      scrollType: 'hidden',
    };
  },
  computed: {
    ...mapState(['player', 'liked']),
    _listData() {
      return this.list.reduce((init, cur, index) => {
        init.push({
          _key: index,
          value: cur,
        });
        return init;
      }, []);
    },
    currentTrack() {
      return this.$store.state.player.currentTrack;
    },
    playlistSource() {
      return this.$store.state.player.playlistSource;
    },
    showScrollTo() {
      return (
        (this.playlistSource.type === this.type &&
          this.playlistSource.id === this.pid) ||
        (this.playlistSource.type === this.type && this.type === 'localtracks')
      );
    },
    rightClickedTrack() {
      return this.$parent.rightClickedTrack || { id: 0 };
    },
    selectedList() {
      return this.$parent.selectedList || [];
    },
    totalRow() {
      return Math.ceil(this.list.length / this.columnNumber);
    },
    listHeight() {
      return this.position[this.position.length - 1]?.bottom || 0;
    },
    aboveRow() {
      return Math.min(this.start, this.aboveValue);
    },
    belowRow() {
      return Math.min(this.totalRow - this.end, this.belowValue);
    },
    containerHeight() {
      const windowHeight = window.innerHeight - 64;
      return Math.min(windowHeight, this.listHeight, this.propsHeight);
    },
    visibleRow() {
      return Math.ceil(this.containerHeight / this.oneHeight);
    },
    visibleData() {
      return this._listData.slice(
        (this.start - this.aboveRow) * this.columnNumber,
        (this.end + this.belowRow) * this.columnNumber
      );
    },
    anchorPoint() {
      return this.position.length
        ? this.position[this.start * this.columnNumber]
        : null;
    },
    end() {
      return this.start + this.visibleRow;
    },
    listStyles() {
      const listHeight = this.totalRow * this.oneHeight;
      const windowHeight = window.innerHeight - 64;
      return {
        gap: `0 ${this.gap}px`,
        gridTemplateColumns: `repeat(${this.columnNumber}, 1fr)`,
        transform: `translateY(${this.startOffset}px)`,
        paddingBottom: `${
          listHeight > windowHeight ? this.paddingBottom : 0
        }px`,
      };
    },
    isVirtualScroll() {
      return this.scrollTop > 0 && !this.toBottom;
    },
  },
  watch: {
    ...mapMutations(['setVirtualScroll']),
    isVirtualScroll(val) {
      if (this.enabled) this.$store.commit('setVirtualScroll', val);
    },
    rightClickedTrack(val) {
      if (val.id === 0) {
        this.$refs.listRef.style.overflowY = this.scrollType;
      } else {
        this.$refs.listRef.style.overflowY = 'hidden';
      }
    },
    _listData() {
      this.initPosition();
    },
  },
  created() {
    this.initPosition();
  },
  mounted() {
    this.oneHeight = this.$refs.itemsRef
      ? this.$refs.itemsRef[0]?.getBoundingClientRect()?.height
      : 64;
    if (this.enabled) {
      this.aber = this.observer();
      this.aber.observe(this.$refs.listRef);
    }
  },
  updated() {
    if (this.enabled) {
      this.$nextTick(() => {
        this.updateItemsSize();
        this.setStartOffset();
      });
    }
  },
  deactivated() {
    if (this.enabled) this.$store.commit('setVirtualScroll', false);
  },
  beforeDestroy() {
    if (this.enabled) this.$store.commit('setVirtualScroll', false);
    if (this.aber !== null) {
      this.aber.disconnect();
      this.aber = null;
    }
  },
  methods: {
    ...mapActions(['likeATrack']),
    observer() {
      const observer = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              this.$refs.listRef.style.overflowY = 'scroll';
              this.scrollType = 'scroll';
            } else {
              this.$refs.listRef.style.overflowY = 'hidden';
              this.scrollType = 'hidden';
            }
          });
        },
        {
          root: null,
          // rootMargin: '-64px 0px 0px 0px',
          threshold: 0.95,
        }
      );
      return observer;
    },
    initPosition() {
      this.position = this._listData.map((d, index) => ({
        index,
        height: this.itemSize,
        top: Math.floor(index / this.columnNumber) * this.itemSize,
        bottom: Math.floor(index / this.columnNumber + 1) * this.itemSize,
      }));
    },
    getStartIndex(scrollTop = 0) {
      let start = 0;
      let end = Math.ceil(this.position.length / this.columnNumber) - 1;
      let tempIndex = null;

      while (start <= end) {
        const midIndex = Math.floor((start + end) / 2);
        const midValue = this.position[midIndex * this.columnNumber].bottom;

        if (midValue === scrollTop) {
          return midIndex;
        } else if (midValue < scrollTop) {
          start = midIndex + 1;
        } else {
          if (tempIndex === null || tempIndex > midIndex) {
            tempIndex = midIndex;
          }
          end -= 1;
        }
      }
      return tempIndex;
    },
    scrollToTop() {
      let isScrolling = true;
      this.$refs.listRef.scrollTo({ top: 0, behavior: 'smooth' });
      const checkScrolling = () => {
        const currentScrollTop = this.$refs.listRef.scrollTop;
        if (currentScrollTop === this.lastScrollTop) {
          if (isScrolling) {
            isScrolling = false;
            this.$parent.scrollTo(0);
          }
        } else {
          this.lastScrollTop = currentScrollTop;
          requestAnimationFrame(checkScrolling);
        }
      };
      setTimeout(() => {
        requestAnimationFrame(checkScrolling);
      });
    },
    // 滚动到当前歌曲的功能时，如果props.itemSize与实际不符合时，此时position的值不准确
    // 会导致滚动到错误的位置，但滚动的过程中已经自动修正position位置，再次调用后才会到准确
    // 的位置
    scrollToCurrentTrack() {
      let isScrolling = true;
      this.lastContainerTop = this.$refs.listRef.getBoundingClientRect().top;
      this.$parent.scrollTo(474);

      const checkScrolling = () => {
        const currentContainerTop =
          this.$refs.listRef.getBoundingClientRect().top;
        if (currentContainerTop === this.lastContainerTop) {
          if (isScrolling) {
            const index = this.list.findIndex(
              d => d.id === this.currentTrack.id
            );
            this.start = Math.max(0, Math.floor(index - this.visibleRow / 2));
            const startOffset = this.position[this.start].bottom;
            this.$refs.listRef.scrollTo({
              top: startOffset,
              behavior: 'smooth',
            });
            isScrolling = false;
          }
        } else {
          this.lastContainerTop = currentContainerTop;
          requestAnimationFrame(checkScrolling);
        }
      };
      setTimeout(() => {
        requestAnimationFrame(checkScrolling);
      });
    },
    scrollEvent() {
      const scrollTop = this.$refs.listRef.scrollTop;
      const containerHeight = this.$refs.listRef.clientHeight;
      const contentHeight = this.listHeight;

      if (scrollTop + containerHeight >= contentHeight) {
        this.toBottom = true;
      } else {
        this.toBottom = false;
      }

      this.scrollTop = scrollTop;
      if (
        scrollTop > this.anchorPoint.bottom ||
        scrollTop < this.anchorPoint.top
      ) {
        this.start = this.getStartIndex(scrollTop);
        this.setStartOffset();
      }
    },
    updateItemsSize() {
      this.$refs.itemsRef?.forEach(node => {
        if (node.id % this.columnNumber === 0) {
          const height = node.getBoundingClientRect().height;
          const index = +node.id;
          const oldHeight = this.position[index].height;
          const diff = oldHeight - height;

          if (diff) {
            this.position[index].bottom -= diff;
            this.position[index].height = height;
            this.position[index].over = true;

            for (let k = index + 1; k < this.position.length; k++) {
              if (k % this.columnNumber !== 0) break;
              this.position[k].top =
                this.position[k - this.columnNumber].bottom;
              this.position[k].bottom -= diff;
            }
          }
        }
      });
    },
    setStartOffset() {
      if (this.start >= 1) {
        const size =
          this.position[this.start * this.columnNumber].top -
          (this.position[(this.start - this.aboveRow) * this.columnNumber]
            .top || 0);
        this.startOffset =
          this.position[(this.start - 1) * this.columnNumber].bottom - size;
      } else {
        this.startOffset = 0;
      }
    },
  },
};
</script>

<style scoped lang="scss">
.virtual-scroll {
  // background-color: red;
  // padding-bottom: 64px;
  position: relative;
}
.virtual-scroll::-webkit-scrollbar {
  display: none;
}
.infinite-list-phantom {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  z-index: -1;
}
.infinite-list {
  display: grid;
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
  top: 50%;
  right: 30px;
  transform: translate(0, -50%);
  transition: opacity 0.3s ease;
  z-index: 1;
  color: var(--color-text);
}
.position:hover {
  opacity: 0.9;
  cursor: pointer;
}
</style>

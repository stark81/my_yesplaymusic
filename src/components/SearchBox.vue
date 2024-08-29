<template>
  <div class="search-container">
    <div
      ref="searchIconRef"
      class="search-icon"
      :class="{ active: showInput }"
      @click="toggleInput"
      ><svg-icon icon-class="search"
    /></div>
    <input
      ref="inputRef"
      v-model="keywords"
      type="search"
      class="search-input"
      :placeholder="placeholder"
      :style="{ width: showInputWidth + 'px', padding: showPadding }"
      @keydown.enter="doKeydownEnter"
      @blur="doblur"
    />
  </div>
</template>

<script>
export default {
  name: 'SearchBox',
  props: {
    inputWidth: { type: Number, default: 140 },
    placeholder: { type: String, default: '搜索' },
    clearKeywords: { type: Boolean, default: false },
  },
  data() {
    return {
      showInput: false,
      keywords: '',
    };
  },
  computed: {
    showInputWidth() {
      return this.showInput ? this.inputWidth : 0;
    },
    showPadding() {
      return this.showInput ? '4px' : '0px';
    },
  },
  watch: {
    keywords(val) {
      this.$emit('update:keywords', val);
    },
  },
  methods: {
    doblur() {
      if (!this.keywords) {
        this.toggleInput();
      }
    },
    doKeydownEnter() {
      this.$emit('keydownEnter', this.keywords);
      if (!this.clearKeywords) return;
      this.keywords = '';
      this.$refs.inputRef.blur();
    },
    toggleInput() {
      this.showInput = !this.showInput;
      if (this.showInput) {
        this.$emit('searchbox-focus');
        this.$nextTick(() => {
          this.$refs.inputRef.focus();
        });
      } else {
        this.$nextTick(() => {
          this.$refs.inputRef.blur();
        });
      }
    },
  },
};
</script>

<style scoped lang="scss">
.search-container {
  display: flex;
  align-items: center;
  border: none;
  border-radius: 8px;
  -webkit-app-region: no-drag;
  height: 32px;
  box-sizing: border-box;
  background: var(--color-secondary-bg-for-transparent);
}

.search-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.svg-icon {
  height: 14px;
  width: 14px;
  opacity: 0.28;
}

.search-input {
  padding: 4px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  border-radius: 4px;
  color: var(--color-text);
  background: transparent;
  transition: all 0.3s;
}
</style>

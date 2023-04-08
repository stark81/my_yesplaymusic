<template>
  <div class="like-button" @click="handleClick">
    <svg-icon :icon-class="liked ? 'liked' : 'like'" />
  </div>
</template>

<script>
export default {
  props: {
    liked: Boolean,
  },
  methods: {
    handleClick() {
      this.$emit('liked', !this.liked);
    },
  },
};
</script>
<style lang="scss" scoped>
.like-button {
  .svg-icon {
    height: 26px;
    width: 26px;
    vertical-align: middle;
  }
}
</style>

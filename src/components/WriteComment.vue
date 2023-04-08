<template>
  <div>
    <form>
      <textarea
        ref="input"
        v-model="comment"
        :placeholder="placeholder"
        class="comment_box"
        @keydown.enter="() => handleEnterKey()"
      ></textarea>
      <div class="commit_button" @click="submitComment">发送</div>
    </form>
  </div>
</template>

<script>
import { isAccountLoggedIn } from '@/utils/auth';

export default {
  props: {
    // eslint-disable-next-line vue/require-default-prop
    placeholder: String,
  },
  data() {
    return {
      comment: '',
    };
  },
  methods: {
    handleEnterKey() {
      if (event.code === 'Enter' && event.metaKey) {
        this.submitComment();
      }
    },
    submitComment() {
      this.$emit('comment-submitted', this.comment);
      if (isAccountLoggedIn()) {
        this.comment = '';
      }
    },
  },
};
</script>
<style lang="scss" scoped>
div {
  form {
    display: flex;
    align-items: center;
    .comment_box {
      // display: inline-block;
      color: var(--color-text);
      border-radius: 12px 0 0 12px;
      width: 100%;
      height: 60px;
      font-size: 16px;
      background: var(--color-secondary-bg-for-transparent);
      resize: none;
      outline: none;
      border: none;
      padding: 10px 18px 10px 18px;
    }
    .comment_box::placeholder {
      opacity: 0.6;
      color: var(--color-text);
    }
    .commit_button {
      text-align: center;
      height: 80px;
      line-height: 80px;
      display: inline-block;
      width: 120px;
      margin-left: 1px;
      border-radius: 0 12px 12px 0;
      background: var(--color-secondary-bg-for-transparent);
      cursor: pointer;
    }
  }
}
</style>

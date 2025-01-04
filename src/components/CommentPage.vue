<template>
  <div>
    <Comment v-show="currentPage === 'comment'" :id="id" :type="type" />
    <CommentFloor
      v-if="currentPage === 'floorComment'"
      :id="id"
      :type="type"
      :be-replied-comment-id="beRepliedCommentId"
    />
  </div>
</template>

<script>
import Comment from '@/components/CommentList.vue';
import CommentFloor from '@/components/CommentFloor.vue';

export default {
  name: 'CommentPage',
  components: {
    Comment,
    CommentFloor,
  },
  props: {
    id: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      default: 'music',
    },
  },
  data() {
    return {
      currentPage: 'comment',
      beRepliedCommentId: 0,
    };
  },
};
</script>

<style lang="scss" scoped></style>

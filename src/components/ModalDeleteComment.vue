<template>
  <Modal
    class="delete-comment-modal"
    :show="show"
    :close="close"
    :title="isFloorComment ? '是否删除楼层评论：' : '是否删除歌曲评论：'"
    width="25vw"
    :style="isLyricPage ? 'background-color: rgba(0, 0, 0, 0.38)' : null"
  >
    <template slot="default">
      <div>{{ comment.beRmComment }}</div>
    </template>
    <template slot="footer">
      <button class="primary block" @click="deleteComment">删除</button>
    </template>
  </Modal>
</template>

<script>
import Modal from '@/components/Modal.vue';
import locale from '@/locale';
import { mapMutations, mapState, mapActions } from 'vuex';
import { handleSubmitComment } from '@/api/comment';

export default {
  name: 'ModalDeleteComment',
  components: {
    Modal,
  },
  computed: {
    ...mapState(['modals', 'settings']),
    show: {
      get() {
        return this.modals.deleteCommentModal.show;
      },
      set(value) {
        this.updateModal({
          modalName: 'deleteCommentModal',
          key: 'show',
          value,
        });
      },
    },
    isFloorComment: {
      get() {
        return this.modals.deleteCommentModal.isFloorComment;
      },
      set(value) {
        this.updateModal({
          modalName: 'deleteCommentModal',
          key: 'isFloorComment',
          value,
        });
      },
    },
    comment: {
      get() {
        return this.modals.deleteCommentModal.comment;
      },
      set(value) {
        this.updateModal({
          modalName: 'deleteCommentModal',
          key: 'comment',
          value,
        });
      },
    },
    finish: {
      get() {
        return this.modals.deleteCommentModal.finish;
      },
      set(value) {
        this.updateModal({
          modalName: 'deleteCommentModal',
          key: 'finish',
          value,
        });
      },
    },
    isLyricPage() {
      return (
        this.settings.lyricsBackground !== false && this.$parent.showLyrics
      );
    },
  },
  methods: {
    ...mapMutations(['updateModal', 'updateData']),
    ...mapActions(['showToast']),
    close() {
      this.show = false;
      this.isFloorComment = false;
      this.comment = {};
    },
    deleteComment() {
      handleSubmitComment(
        0,
        this.comment['type'],
        this.comment['trackID'],
        this.comment['beRmComment'],
        this.comment['commentID']
      ).then(data => {
        if (data.code === 200) {
          this.showToast(locale.t('toast.deletedComment'));
          this.finish = true;
          this.close();
        }
      });
    },
  },
};
</script>

<style lang="scss" scoped></style>

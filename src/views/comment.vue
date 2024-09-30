<template>
  <Transition ref="main" name="slide-fade">
    <div class="comment-container">
      <div class="comment-head">
        <label>评论({{ sourceComments.totalCount }})</label>
        <div class="btns">
          <button
            class="btn"
            :class="{ active: sourceComments.activate == 1 }"
            @click="switchComment(1)"
            >推荐
          </button>
          <button
            class="btn"
            :class="{ active: sourceComments.activate == 2 }"
            @click="switchComment(2)"
            >最热
          </button>
          <button
            class="btn"
            :class="{ active: sourceComments.activate == 3 }"
            @click="switchComment(3)"
            >最新
          </button>
        </div>
      </div>
      <div ref="commentRef" class="comment-main" @scroll="loadMoreComments">
        <div
          v-for="(comment, index) in sourceComments.comments"
          :id="`comment${index}`"
          :key="index"
          class="comment-item"
        >
          <div class="avatar">
            <img
              :src="comment.user.avatarUrl + '?param=64y64'"
              loading="lazy"
            />
          </div>
          <div class="comment-info">
            <div class="comment">
              <label class="comment-nickname"
                >{{ comment.user.nickname }}:
              </label>
              <label>{{ comment.content }}</label>
            </div>
            <div class="comment-ex">
              <div>{{ comment.time | formatDate('YYYY年MM月DD日 H:mm') }}</div>
              <div class="comment-btns">
                <button
                  v-if="isAccountLoggedIn && comment.owner"
                  @click="handleDeleteComment(comment)"
                  >删除</button
                >
                <button @click="handleLiked(comment)"
                  ><svg-icon :icon-class="comment.liked ? 'liked' : 'like'" />{{
                    comment.likedCount
                  }}</button
                >
                <button @click="switch2FloorComment(comment.commentId)">
                  <svg-icon icon-class="comment" />{{ comment.replyCount }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="write_comment">
        <WriteComment
          placeholder="随乐而起，有感而发"
          @comment-submitted="addComment"
          @keydown.enter="addComment"
        />
      </div>
    </div>
  </Transition>
</template>
<script>
import { mapActions, mapMutations, mapState } from 'vuex';
import { isAccountLoggedIn } from '@/utils/auth';
import {
  getSongNewComment,
  handlCommentLiked,
  handleSubmitComment,
} from '@/api/comment';
import WriteComment from '@/components/WriteComment.vue';
import locale from '@/locale';

export default {
  name: 'Comment',
  components: {
    WriteComment,
  },
  data() {
    return {
      reply2Name: '',
      sourceComments: {
        type: 0,
        isDelete: false,
        isLoading: false,
        sortType: 1,
        activate: 1,
        pageSize: 30,
        pageNo: 1,
        hasMore: true,
        totalCount: 0,
        cursor: 0,
        addedCountList: [],
        comments: [],
      },
      deleteComment: null,
    };
  },
  computed: {
    ...mapState(['player', 'modals']),
    currentTrack() {
      return this.player.currentTrack;
    },
    isAccountLoggedIn() {
      return isAccountLoggedIn();
    },
    isFloorComment() {
      return this.modals.deleteCommentModal.isFloorComment;
    },
    finish() {
      return this.modals.deleteCommentModal.finish;
    },
    showSelf() {
      return this.$parent.show === 'comment';
    },
  },
  watch: {
    currentTrack() {
      this.deleteComment = null;
      this.switchComment(this.sourceComments.activate);
    },
    finish(newVal) {
      if (this.$parent.show === 'comment' && newVal === true) {
        this.sourceComments.comments = this.sourceComments.comments.filter(
          c => c.commentId !== this.deleteComment.commentId
        );
      }
    },
  },
  // mounted: function () {
  //   window.addEventListener('scroll', this.loadMoreComments, true);
  //   window.addEventListener('resize', this.handleResize);
  // },
  created() {
    this.getComment();
  },
  beforeDestroy() {
    this.comment2Top();
    window.removeEventListener('resize', this.handleResize);
  },
  methods: {
    ...mapActions(['showToast']),
    ...mapMutations(['updateModal']),
    switch2FloorComment(comment_id) {
      this.$parent.Bus.$emit('showFloors', {
        show: 'floor_comment',
        commentId: comment_id,
      });
    },
    // 处理窗口变化
    handleResize() {
      this.clientHeight = window.innerHeight; // 更新窗口高度
    },
    reSetData() {
      this.sourceComments.sortType = 1;
      this.sourceComments.pageNo = 1;
      this.sourceComments.cursor = 0;
      this.sourceComments.addedCountList = [];
      this.sourceComments.comments = [];
      this.sourceComments.hasMore = true;
      // this.sourceComments.totalCount = 0;
    },
    // 点赞/取消点赞
    handleLiked(comment) {
      if (!isAccountLoggedIn()) {
        this.showToast(locale.t('toast.needToLogin'));
        return;
      }
      handlCommentLiked(
        this.player.currentTrack.onlineTrack?.id || this.player.currentTrack.id,
        comment.commentId,
        !comment.liked ? 1 : 0,
        this.sourceComments.type
      )
        .then(res => {
          if (res.code === 200) {
            comment.likedCount += comment.liked ? -1 : 1;
            comment.liked = !comment.liked;
          } else {
            this.showToast(res.msg + res?.data?.dialog?.subtitle);
          }
        })
        .catch(err => {
          this.showToast(err);
        });
    },
    // 评论相关功能
    switchComment(activate) {
      this.reSetData();
      this.sourceComments.activate = activate;
      this.sourceComments.sortType = activate;
      this.getComment();
      this.comment2Top();
    },
    async getComment() {
      if (this.sourceComments.isLoading) return;
      if (
        this.sourceComments.pageNo !=
        this.sourceComments.addedCountList.length + 1
      ) {
        this.sourceComments.pageNo =
          this.sourceComments.addedCountList.length + 1;
      }
      if (this.currentTrack.matched === false) return;
      this.sourceComments.isLoading = true;
      const data = await getSongNewComment(
        this.player.currentTrack.onlineTrack?.id || this.player.currentTrack.id,
        this.sourceComments.type,
        this.sourceComments.pageNo,
        this.sourceComments.pageSize,
        this.sourceComments.sortType,
        this.sourceComments.cursor
      );
      if (data.data.hasMore) {
        this.sourceComments.cursor = data.data.cursor;
      }
      this.sourceComments.hasMore = data.data.hasMore;
      this.sourceComments.totalCount = data.data.totalCount;
      if (data.data.comments.length != 0) {
        this.sourceComments.addedCountList.push(data.data.comments.length);
        const newComments = [
          ...new Set([...this.sourceComments.comments, ...data.data.comments]),
        ];
        this.sourceComments.comments = [...new Set(newComments)].filter(
          comment => {
            return (
              !comment.content.includes('礼品卡') &&
              !comment.content.includes('https:') &&
              !comment.content.includes('黑胶会员') &&
              !comment.content.includes('→ 往这划  ←')
            );
          }
        );
      }
      this.sourceComments.pageNo++;
      this.sourceComments.isLoading = false;
    },
    comment2Top() {
      const el = document.getElementById('Container');
      if (el) {
        el.scrollTop = 0;
      }
    },
    loadMoreComments() {
      const commentRef = this.$refs.commentRef;
      let scrollTop = commentRef.scrollTop;
      let clientHeight = commentRef.clientHeight;
      let scrollHeight = commentRef.scrollHeight;
      if (scrollTop + clientHeight >= scrollHeight) {
        if (
          !this.sourceComments.hasMore &&
          this.sourceComments.sortType === 1
        ) {
          this.sourceComments.hasMore = true;
          this.sourceComments.sortType = 3;
          this.pageNo = 0;
        }
        this.getComment();
      }
    },
    // 删除评论
    handleDeleteComment(comment) {
      this.deleteComment = comment;
      const rmComment = {
        type: 0,
        trackID:
          this.player.currentTrack.onlineTrack?.id ||
          this.player.currentTrack.id,
        beRmComment: comment.content,
        commentID: comment.commentId,
      };
      this.updateModal({
        modalName: 'deleteCommentModal',
        key: 'isFloorComment',
        value: false,
      });
      this.updateModal({
        modalName: 'deleteCommentModal',
        key: 'show',
        value: true,
      });
      this.updateModal({
        modalName: 'deleteCommentModal',
        key: 'comment',
        value: rmComment,
      });
      // setTimeout(() => {
      //   this.sourceComments.comments = this.sourceComments.comments.filter(
      //     c => c.commentId !== comment.commentId
      //   );
      // }, 1000);
    },
    addComment(comment) {
      if (!isAccountLoggedIn()) {
        this.showToast(locale.t('toast.needToLogin'));
        return;
      }
      handleSubmitComment(
        1,
        this.sourceComments.type,
        this.player.currentTrack.id,
        comment
      )
        .then(response => {
          if (response && response.code === 200) {
            this.sourceComments.sortType = 3;
            this.switchComment(this.sourceComments.sortType);
            const data = response.comment;
            data.likedCount = 0;
            data.replyCount = 0;
            data.time = Date.now();
            this.sourceComments.comments.push(response.comment);
          } else {
            this.showToast(
              response?.body?.message || locale.t('toast.commentFailed')
            );
          }
        })
        .catch(error => {
          this.showToast(error);
        });
    },
  },
};
</script>

<style lang="scss" scoped>
.comment-container {
  height: 100vh;
  width: 50vw;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  scrollbar-width: none;
  padding: 40px 6vw 0 4vw;
  transition: all 0.5s;
}

.comment-head {
  display: flex;
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 20px;
  justify-content: space-between;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;

  .btns {
    display: flex;
    text-align: center;
    justify-items: center;
    .btn {
      font-size: 16px;
      font-weight: bold;
      padding: 0 10px;
      opacity: 0.5;
      color: var(--color-text);
      -webkit-app-region: no-drag;
      cursor: pointer;
    }
    .btn.active {
      opacity: 1;
    }
  }
}

.comment-main {
  height: calc(100vh - 140px);
  overflow-y: scroll;
}

.comment-item {
  display: flex;
  width: 100%;
  opacity: 0.9;
  margin-bottom: 10px;

  img {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    margin-right: 10px;
  }
}
.comment-info {
  display: flex;
  flex-direction: column;
  width: 100%;
}
.comment {
  width: auto;

  .comment-nickname {
    font-weight: bold;
  }
}
.comment-ex {
  display: flex;
  margin-top: 4px;
  padding-bottom: 10px;
  width: 100%;
  font-size: 14px;
  opacity: 0.7;
  text-align: center;
  justify-content: center;
  justify-content: space-between;

  .comment-btns {
    display: flex;

    button {
      display: flex;
      margin-left: 10px;
      align-items: center;
      margin: 4px;
      border-radius: 25%;
      color: var(--color-text);
      cursor: pointer;

      .svg-icon {
        height: 16px;
        width: 16px;
        margin-right: 4px;
      }
    }
  }
}
.slide-fade-enter-active {
  transition: all 0.5s ease;
}

.slide-fade-leave-active {
  transition: all 0.5s cubic-bezier(0.2, 0.2, 0, 1);
}

.slide-fade-enter,
.slide-fade-leave-to {
  transform: translateX(27vh);
  opacity: 0;
}
</style>

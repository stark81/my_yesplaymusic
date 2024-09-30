<template>
  <div class="comment-container">
    <div class="comment-head">
      <label>回复({{ totalCount }})</label>
      <div class="btns">
        <button class="btn" @click="closeFloor">关闭</button>
      </div>
    </div>
    <div ref="floorRef" class="comment-main" @scroll="loadMoreFloorComment">
      <div
        v-for="(comment, index) in comments"
        :id="`comment${index}`"
        :key="index"
        class="comment-item"
        @click="replyFloor(comment)"
      >
        <div class="avatar">
          <img :src="comment.user.avatarUrl + '?param=64y64'" loading="lazy" />
        </div>
        <div class="comment-info">
          <div class="comment">
            <label class="comment-nickname"
              >{{ comment.user.nickname }}：</label
            >
            <label>{{ comment.content }}</label>
          </div>
          <div
            v-if="
              comment.beReplied.length &&
              comment.beReplied[0].beRepliedCommentId !==
                comment.parentCommentId
            "
            class="comment-beReplied"
          >
            <label v-if="comment.beReplied[0].content" class="comment-nickname"
              >@{{ comment.beReplied[0].user.nickname }}:
            </label>
            <label>{{ comment.beReplied[0].content || '该评论已删除' }}</label>
          </div>
          <div class="comment-ex">
            <div>{{ comment.time | formatDate('YYYY年MM月DD日 H:mm') }}</div>
            <div class="comment-btns">
              <button
                v-if="isAccountLoggedIn && comment.owner"
                @click.stop="DeleteFloor(comment)"
                >删除</button
              >
              <button @click.stop="likeFloorComment(comment)"
                ><svg-icon :icon-class="comment.liked ? 'liked' : 'like'" />{{
                  comment.likedCount
                }}</button
              >
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="write_comment">
      <WriteComment
        ref="writeFloorRef"
        :placeholder="reply2Name"
        @comment-submitted="writeFloorComment"
        @keydown.enter="writeFloorComment"
      />
    </div>
  </div>
</template>
<script>
import { mapActions, mapMutations, mapState } from 'vuex';
import { isAccountLoggedIn } from '@/utils/auth';
import WriteComment from '@/components/WriteComment.vue';
import locale from '@/locale';
import {
  getFloorComment,
  handleSubmitComment,
  handlCommentLiked,
} from '@/api/comment';

export default {
  name: 'CommentFloor',
  components: {
    WriteComment,
  },
  data() {
    return {
      isLoading: false,
      hasInit: false,
      reply2Name: '',
      limit: 20,
      deleteComment: null,
      ownerComment: [],
      currentComment: null,
      comments: [],
      hasMore: true,
      totalCount: 0,
      time: '',
      bestComments: [],
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
    containerStyle() {
      const height = this.clientHeight - 180;
      return { height: `${height}px` };
    },
    isFloorComment() {
      return this.modals.deleteCommentModal.isFloorComment;
    },
    finish() {
      return this.modals.deleteCommentModal.finish;
    },
  },
  watch: {
    currentTrack() {
      this.closeFloor();
    },
    finish(newVal) {
      if (this.$parent.show === 'floor_comment' && newVal === true) {
        this.comments = this.comments.filter(
          c => c.commentId !== this.deleteComment.commentId
        );
      }
    },
  },
  mounted: function () {
    // window.addEventListener('scroll', this.loadMoreFloorComment, true);
    // window.addEventListener('resize', this.handleResize);
  },
  created() {
    this.commentId = this.$parent.commentId;
    this.showFloor();
  },
  beforeDestroy() {
    this.deleteComment = null;
    window.removeEventListener('resize', this.handleResize);
  },
  methods: {
    ...mapActions(['showToast']),
    ...mapMutations(['updateModal']),
    loadMoreFloorComment() {
      if (!this.hasMore || this.isLoading) return;
      const floorRef = this.$refs.floorRef;
      let scrollTop = floorRef.scrollTop;
      let clientHeight = floorRef.clientHeight;
      let scrollHeight = floorRef.scrollHeight;
      if (scrollTop + clientHeight >= scrollHeight) {
        this.showFloor();
      }
    },
    async showFloor() {
      if (this.isLoading || !this.hasMore) return;
      this.isLoading = true;
      const result = await getFloorComment(
        this.commentId,
        this.$parent.currentTrack.id,
        0,
        this.limit,
        this.time
      );
      // Object.assign(this.$data, result.data);
      if (!this.hasInit) {
        Object.assign(this.$data, result.data);
        this.comments.unshift(this.ownerComment);
        this.reply2Name = `回复${this.ownerComment.user.nickname}:`;
        this.hasInit = true;
      } else {
        this.comments = [...this.comments, ...result.data.comments];
        this.currentComment = result.data.currentComment;
        this.hasMore = result.data.hasMore;
        this.time = result.data.time;
        this.bestComments = [...this.bestComments, ...result.data.bestComments];
      }
      this.isLoading = false;
    },
    closeFloor() {
      this.$parent.Bus.$emit('showComment', 'comment');
    },
    writeFloorComment(comment) {
      if (!isAccountLoggedIn()) {
        this.showToast(locale.t('toast.needToLogin'));
        return;
      }
      handleSubmitComment(
        2,
        this.$parent.type,
        this.$parent.currentTrack.id,
        comment,
        this.commentId
      )
        .then(response => {
          if (response && response.code === 200) {
            const reply_comment = response.comment;
            reply_comment.beReplied = [];
            this.comments.push(response.comment);
          } else if (response && response.code !== 200) {
            this.showToast(response.data.dialog.subtitle);
          } else {
            this.showToast(locale.t('toast.commentFailed'));
          }
        })
        .catch();
    },
    likeFloorComment(comment) {
      if (!isAccountLoggedIn()) {
        this.showToast(locale.t('toast.needToLogin'));
        return;
      }
      handlCommentLiked(
        this.$parent.currentTrack.id,
        comment.commentId,
        !comment.liked ? 1 : 0,
        this.$parent.type
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
    replyFloor(comment) {
      this.commentId = comment.commentId;
      this.$refs.writeFloorRef.$refs.input.focus();
      this.reply2Name = `回复${comment.user.nickname}:`;
    },
    DeleteFloor(comment) {
      this.deleteComment = comment;
      const rmComment = {
        type: 0,
        trackID: this.player.currentTrack.id,
        beRmComment: comment.content,
        commentID: comment.commentId,
      };
      this.updateModal({
        modalName: 'deleteCommentModal',
        key: 'isFloorComment',
        value: true,
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
    },
    // 处理窗口变化
    handleResize() {
      this.clientHeight = window.innerHeight; // 更新窗口高度
    },
  },
};
</script>

<style lang="scss" scoped>
.comment-container {
  height: 100vh;
  width: 50vw;
  display: flex;
  box-sizing: border-box;
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
      color: var(--color-text);
      -webkit-app-region: no-drag;
      cursor: pointer;
    }
  }
}

.comment-main {
  // width: 100%;
  // height: calc(100vh - 164px);
  overflow-y: scroll;
}

.comment-item {
  display: flex;
  width: 100%;
  opacity: 0.9;
  margin-bottom: 4px;

  img {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    margin-right: 10px;
  }
}
.comment-item:first-child {
  padding-bottom: 10px;
  .comment-ex {
    padding-bottom: 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.3);
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
.comment-beReplied {
  font-size: 14px;
  margin: 5px 0;
  padding: 6px 10px;
  border-radius: 6px;
  background-color: rgba(0, 0, 0, 0.1);

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

      .svg-icon {
        height: 16px;
        width: 16px;
        margin-right: 4px;
      }
    }
  }
}
</style>

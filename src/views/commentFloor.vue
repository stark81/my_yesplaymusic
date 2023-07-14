<template>
  <Transition ref="main" name="comment-page">
    <div id="CommentFloorContainer" :style="containerStyle">
      <div class="comment-head">
        <label style="float: left">回复({{ totalCount }})</label>
        <div>
          <label @click="closeFloor">关闭</label>
        </div>
      </div>
      <div id="floorContainer">
        <div
          v-for="(comment, index) in comments"
          :id="`comment${index}`"
          :key="index"
          class="one-comment"
        >
          <div class="comment_userinfo">
            <div class="avatar">
              <img :src="comment.user.avatarUrl" />
            </div>
            <div class="userinfo">
              <div>
                <label>{{ comment.user.nickname }} </label>
                <label
                  v-if="
                    comment.beReplied.length == 1 &&
                    comment.beReplied[0].beRepliedCommentId !=
                      ownerComment.commentId &&
                    comment.beReplied[0].status >= 0
                  "
                >
                  ▶️ {{ comment.beReplied[0].user.nickname }}</label
                >
              </div>
              <div class="comment-time">
                <div>{{ comment.timeStr }}</div>
              </div>
            </div>
            <div class="likedcount">
              <LikeButton
                class="likebutton"
                :liked="comment.liked"
                @liked="likeFloorComment(comment, $event)"
              />
              {{ comment.likedCount }}
            </div>
          </div>
          <div class="comment-content">
            <div @click="replyFloor(comment)">{{ comment.content }}</div>
            <div
              v-if="isAccountLoggedIn && comment.owner"
              class="p2"
              @click="DeleteFloor(comment)"
              >删除</div
            >
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
  </Transition>
</template>
<script>
import { mapActions, mapMutations, mapState } from 'vuex';
import { isAccountLoggedIn } from '@/utils/auth';
import LikeButton from '@/components/LikeButton.vue';
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
    LikeButton,
    WriteComment,
  },
  data() {
    return {
      isLoading: false,
      hasInit: false,
      reply2Name: '',
      limit: 20,
      setLikedStyle: {
        backgroundColor: 'blue',
        height: '26px',
        width: '26px',
        margin: '0 0 6px 2px',
      },
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
    window.addEventListener('scroll', this.loadMoreFloorComment, true);
    window.addEventListener('resize', this.handleResize);
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
      if (!this.hasMore) return;
      const el = document.getElementById('floorContainer');
      if (this.isLoading) {
        return;
      }
      if (this.$parent.show === 'floor_comment' && el) {
        let scrollTop = el.scrollTop;
        let clientHeight = el.clientHeight;
        let scrollHeight = el.scrollHeight;
        if (scrollTop + clientHeight >= scrollHeight) {
          this.showFloor();
        }
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
    async writeFloorComment(comment) {
      if (!isAccountLoggedIn()) {
        this.showToast(locale.t('toast.needToLogin'));
        return;
      }
      const response = await handleSubmitComment(
        2,
        this.$parent.type,
        this.$parent.currentTrack.id,
        comment,
        this.commentId
      );
      if (response.code === 200) {
        const reply_comment = response.comment;
        reply_comment.beReplied = [];
        this.comments.push(response.comment);
      } else {
        alert(response.data.dialog.subtitle);
      }
    },
    likeFloorComment(comment, liked) {
      if (!isAccountLoggedIn()) {
        this.showToast(locale.t('toast.needToLogin'));
        return;
      }
      handlCommentLiked(
        this.$parent.currentTrack.id,
        comment.commentId,
        !comment.liked ? 1 : 0,
        this.$parent.type
      );
      comment.liked = liked;
      comment.likedCount += liked ? 1 : -1;
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
#CommentFloorContainer {
  height: 100vh;
  max-width: 600px;
  margin-left: 10px;
  z-index: 10;
  .comment-head {
    line-height: 80px;
    height: 80px;
    overflow: hidden;
    padding-left: 18px;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
    div {
      float: right;
      label {
        padding: 8px 20px;
        border-radius: 8px;
        margin-left: 10px;
        opacity: 0.5;

        &:hover {
          cursor: pointer;
          opacity: 0.9;
          background: var(--color-secondary-bg-for-transparent);
        }
      }
      .active {
        opacity: 0.9;
        background: var(--color-secondary-bg-for-transparent);
      }
    }
  }

  #Container,
  #floorContainer {
    height: calc(100vh - 160px);
    overflow: auto;
    .one-comment {
      margin: 5px 0;
      padding: 18px 18px 0px 18px;
      transition: 0.5s;
      border-radius: 12px;
      white-space: pre-wrap;
      opacity: 0.86;
      .comment_userinfo {
        height: 40px;
        margin-bottom: 10px;
        .avatar {
          height: 40px;
          width: 40px;
          float: left;
          margin-right: 12px;
          background-color: #fff;
          border-radius: 50%;
          img {
            height: 100%;
            width: 100%;
            border-radius: 50%;
          }
        }
        .userinfo {
          float: left;
          font-size: 18px;
          line-height: 24px;
          opacity: 0.85;
          .comment-time {
            font-size: 14px;
            opacity: 0.68;
            line-height: 22px;
          }
        }
        .likedcount {
          float: right;
          font-size: 14px;
          text-align: center;
          cursor: pointer;
        }
      }
      .comment-content {
        padding: 0 50px 0 18;
        position: relative;
        div {
          font-size: 20px;
          line-height: 28px;
          cursor: pointer;
          padding-bottom: 20px;
          border-bottom: 1px solid var(--color-text-transparent);
        }
        .p2 {
          position: absolute;
          top: 0;
          right: 0;
          border-bottom: none;
          padding-right: 2px;
          font-size: 14px;
          text-align: center;
        }
      }
    }
    .one-comment:first-child {
      background: var(--color-secondary-bg-for-transparent);
      border-radius: 12px;
      .comment-content {
        border-bottom: none;
        // display: flex;
        div {
          border-bottom: none;
        }
      }
    }
  }
  .write_comment {
    height: 80px;
    max-width: 600px;
  }
}
</style>

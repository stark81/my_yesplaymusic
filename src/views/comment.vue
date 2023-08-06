<template>
  <Transition ref="main" name="slide-fade">
    <div v-show="showSelf" id="CommentContainer" :style="containerStyle">
      <div class="comment-head">
        <label style="float: left">评论({{ sourceComments.totalCount }})</label>
        <div>
          <label
            :class="{ active: sourceComments.activate == 1 }"
            @click="switchComment(1)"
            >推荐
          </label>
          <label
            :class="{ active: sourceComments.activate == 2 }"
            @click="switchComment(2)"
            >最热
          </label>
          <label
            :class="{ active: sourceComments.activate == 3 }"
            @click="switchComment(3)"
            >最新
          </label>
        </div>
      </div>
      <div id="Container" ref="ContainerRef">
        <div
          v-for="(comment, index) in sourceComments.comments"
          :id="`comment${index}`"
          :key="index"
          class="one-comment"
        >
          <div class="comment_userinfo">
            <div class="avatar">
              <img :src="comment.user.avatarUrl" />
            </div>
            <div class="userinfo">
              <div>{{ comment.user.nickname }}</div>
              <div class="comment-time">
                <div>{{ comment.timeStr }}</div>
              </div>
            </div>
            <div class="likedcount">
              <LikeButton
                class="likebutton"
                :liked="comment.liked"
                @liked="handleLiked(comment, $event)"
              />
              {{ comment.likedCount }}
              <!-- <svg-icon :icon-class="comment.liked ? 'liked' : 'like'" /> -->
            </div>
          </div>
          <div class="comment-content">
            <p @click="switch2FloorComment(comment.commentId)">{{
              comment.content
            }}</p>
            <div class="reply-count">
              <span>{{ comment.replyCount }}条回复</span>
              <span
                v-if="isAccountLoggedIn && comment.owner"
                class="seperate_line"
                >|</span
              >
              <span
                v-if="isAccountLoggedIn && comment.owner"
                class="delect_reply"
                @click="handleDeleteComment(comment)"
              >
                删除
              </span>
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
import LikeButton from '@/components/LikeButton.vue';
import WriteComment from '@/components/WriteComment.vue';
import locale from '@/locale';

export default {
  name: 'Comment',
  components: {
    LikeButton,
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
        pageSize: 50,
        pageNo: 1,
        hasMore: true,
        totalCount: 0,
        cursor: 0,
        addedCountList: [],
        comments: [],
      },
      deleteComment: null,
      setLikedStyle: {
        backgroundColor: 'blue',
        height: '26px',
        width: '26px',
        margin: '0 0 6px 2px',
      },
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
  mounted: function () {
    window.addEventListener('scroll', this.loadMoreComments, true);
    window.addEventListener('resize', this.handleResize);
  },
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
    handleLiked(comment, liked) {
      if (!isAccountLoggedIn()) {
        this.showToast(locale.t('toast.needToLogin'));
        return;
      }
      handlCommentLiked(
        this.player.currentTrack.onlineTrack?.id || this.player.currentTrack.id,
        comment.commentId,
        !comment.liked ? 1 : 0,
        this.sourceComments.type
      );
      comment.liked = liked;
      comment.likedCount += liked ? 1 : -1;
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
      document.getElementById('Container').scrollTop = 0;
    },
    loadMoreComments() {
      if (this.$parent.show == 'comment') {
        const el = document.getElementById('Container');
        if (this.$parent.show === 'comment' && el) {
          let scrollTop = el.scrollTop;
          let clientHeight = el.clientHeight;
          let scrollHeight = el.scrollHeight;
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
        }
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
        this.player.currentTrack.onlineTrack?.id || this.player.currentTrack.id,
        comment
      )
        .then(response => {
          if (response && response.code === 200) {
            this.sourceComments.sortType = 3;
            this.switchComment(this.sourceComments.sortType);
            const data = response.comment;
            data.likedCount = 0;
            data.replyCount = 0;
            data.timeStr = '刚刚';
            this.sourceComments.comments.push(response.comment);
          } else if (response && response.code !== 200) {
            this.showToast(response.data.dialog.subtitle);
          } else {
            this.showToast(locale.t('toast.commentFailed'));
          }
        })
        .catch();
    },
  },
};
</script>

<style lang="scss" scoped>
#CommentContainer {
  height: 100vh;
  max-width: 600px;
  margin-left: 10px;
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

  #Container {
    height: calc(100vh - 160px);
    overflow: auto;
    .one-comment {
      margin: 5px 0;
      padding: 12px 18px 8px 18px;
      transition: 0.5s;
      border-radius: 12px;
      white-space: pre-wrap;
      opacity: 0.86;
      &:hover {
        background: var(--color-secondary-bg-for-transparent);
      }
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
        p {
          font-size: 20px;
          line-height: 28px;
          cursor: pointer;
        }
        // padding-left: 50px;
        .reply-count {
          font-size: 14px;
          opacity: 0.68;
          .seperate_line {
            margin: 0 10px;
          }
          .delect_reply {
            cursor: pointer;
          }
        }
      }
    }
  }
  .write_comment {
    height: 80px;
    max-width: 600px;
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

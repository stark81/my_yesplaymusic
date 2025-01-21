<template>
  <div v-if="show" class="comment-container" :style="containerStyle">
    <div class="comment-head">
      <label>回复({{ floorCommentInfo.totalCount }})</label>
      <div class="btns">
        <button class="btn" @click="switchToCommentPage">关闭</button>
      </div>
    </div>
    <div ref="commentMainRef" class="conment-main" @scroll="scrollEvent">
      <div
        v-for="(item, index) in floorComments"
        :key="index"
        class="comment-item"
        :class="{ first: index === 0 }"
      >
        <div class="avatar"
          ><img :src="getImage(item.user.avatarUrl)" alt="" loading="lazy"
        /></div>
        <div class="comment-info" @click="replyFloor(item)">
          <div class="comment">
            <label class="comment-nickname">{{ item.user.nickname }}：</label>
            <label>{{ item.content }}</label>
          </div>
          <div
            v-if="
              item.beReplied?.length &&
              item.beReplied[0].beRepliedCommentId !== item.parentCommentId
            "
            class="comment-beReplied"
          >
            <label v-if="item.beReplied[0].content" class="comment-nickname"
              >@{{ item.beReplied[0].user.nickname }}:
            </label>
            <label>{{ item.beReplied[0].content ?? '该评论已删除' }}</label>
          </div>
          <div class="comment-ex">
            <div class="time-ip">
              <div class="time">{{
                item.time | formatDate('YYYY年MM月DD日 H:mm')
              }}</div>
              <div v-if="item.ipLocation?.location"
                >来自{{ item.ipLocation.location }}</div
              >
            </div>
            <div class="comment-btns">
              <button
                v-if="isAccountLoggedIn && item.owner"
                @click.stop="handleDeleteComment(item)"
                >删除</button
              >
              <button @click.stop="handleLikeComment(item)"
                ><svg-icon :icon-class="item.liked ? 'liked' : 'like'" />{{
                  item.likedCount
                }}</button
              >
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="write-comment">
      <WriteComment
        ref="commentSubmitRef"
        :placeholder="placeholder"
        @comment-submitted="handleSubmitComment"
        @keydown.enter="handleSubmitComment"
      />
    </div>
  </div>
</template>

<script>
import { mapActions } from 'vuex';
import WriteComment from './WriteComment.vue';
import { getFloorComment, likeComment, submitComment } from '@/api/comment';
import { isAccountLoggedIn } from '@/utils/auth';
import locale from '@/locale';

const typeMap = {
  music: 0,
  mv: 1,
  playlist: 2,
  album: 3,
  djRadio: 4,
  video: 5,
};

export default {
  name: 'CommentFloor',
  components: {
    WriteComment,
  },
  props: {
    id: {
      type: Number,
      default: 0,
    },
    type: {
      type: String,
      default: 'music',
    },
    beRepliedCommentId: {
      type: Number,
      required: true,
    },
  },
  data() {
    return {
      show: false,
      floorCommentInfo: {
        totalCount: 0,
        hasMore: true,
        limit: 30,
        time: 0,
        commentId: 0,
      },
      floorComments: [],
      selectedComment: null,
    };
  },
  computed: {
    currentPage: {
      get() {
        return this.$parent.currentPage;
      },
      set(value) {
        this.$parent.currentPage = value;
      },
    },
    containerStyle() {
      return {
        height: this.type === 'mv' ? 'calc(100vh - 84px)' : '100vh',
        padding: this.type === 'mv' ? '0 0 0 3vh' : '40px 8vh 0 4vh',
      };
    },
    placeholder() {
      return `回复${this.selectedComment?.user.nickname || ''}：`;
    },
    isAccountLoggedIn() {
      return isAccountLoggedIn();
    },
  },
  created() {
    this.loadComment(this.beRepliedCommentId);
    this.show = true;
  },
  methods: {
    ...mapActions(['showToast']),
    switchToCommentPage() {
      this.currentPage = 'comment';
      this.show = false;
    },
    loadComment(pid) {
      if (!this.floorCommentInfo.hasMore) return;
      getFloorComment({
        parentCommentId: pid,
        id: this.id,
        type: typeMap[this.type],
        limit: this.floorCommentInfo.limit,
        time: this.floorCommentInfo.time,
      }).then(res => {
        if (res.code === 200) {
          this.floorCommentInfo.time = res.data.time;
          this.floorCommentInfo.hasMore = res.data.hasMore;
          this.floorCommentInfo.totalCount =
            res.data.totalCount || this.floorCommentInfo.totalCount;
          if (res.data.ownerComment) {
            this.floorCommentInfo.commentId = res.data.ownerComment.commentId;
            this.selectedComment = res.data.ownerComment;
            this.floorComments.push(res.data.ownerComment);
          }
          this.floorComments.push(...res.data.bestComments);
          this.floorComments.push(...res.data.comments);
        }
      });
    },
    getImage(url) {
      if (url.startsWith('http:')) {
        url = url.replace('http:', 'https:');
      }
      return url + '?param=64y64';
    },
    replyFloor(item) {
      this.selectedComment = item;
    },
    handleDeleteComment(item) {
      if (!isAccountLoggedIn()) {
        this.showToast(locale.t('toast.needToLogin'));
        return;
      }
      if (confirm(`确定要删除评论'${item.content}'吗？`)) {
        const params = {
          t: 0,
          type: typeMap[this.type],
          id: this.id,
          commentId: item.commentId,
        };
        submitComment(params).then(res => {
          if (res.code === 200) {
            this.floorComments = this.floorComments.filter(
              comment => comment !== item
            );
            this.floorCommentInfo.totalCount -= 1;
          } else {
            this.showToast(`${res.message}，${res.data?.dialog?.subtitle}`);
          }
        });
      }
    },
    handleLikeComment(item) {
      if (!isAccountLoggedIn()) {
        this.showToast(locale.t('toast.needToLogin'));
        return;
      }
      likeComment({
        id: this.id,
        cid: item.commentId,
        t: item.liked ? 0 : 1,
        type: typeMap[this.type],
      })
        .then(res => {
          if (res.code === 200) {
            item.liked = !item.liked;
            item.likedCount += item.liked ? 1 : -1;
          } else {
            this.showToast(`${res.msg}, ${res?.data?.dialog?.subtitle}`);
          }
        })
        .catch(err => {
          this.showToast(err);
        });
    },
    handleSubmitComment(text) {
      if (!isAccountLoggedIn()) {
        this.showToast(locale.t('toast.needToLogin'));
        return;
      }
      submitComment({
        t: 2,
        type: typeMap[this.type],
        id: this.id,
        content: text,
        commentId: this.selectedComment.commentId,
      })
        .then(res => {
          if (res.code !== 200) {
            this.showToast(res.msg);
            return;
          }
          const comment = res.comment;
          comment.owner = true;
          comment.likedCount = 0;
          comment.beReplied = [];
          this.floorCommentInfo.totalCount += 1;
          if (
            this.selectedComment.commentId !== this.floorCommentInfo.commentId
          ) {
            comment.beReplied.push({
              beRepliedCommentId: this.selectedComment.commentId,
              content: this.selectedComment.content,
              user: { nickname: this.selectedComment.user.nickname },
            });
          }
          this.floorComments.splice(1, 0, comment);
        })
        .catch(err => {
          this.showToast(err);
        });
    },
    rafThrottle(func) {
      this.lock = false;
      return (...args) => {
        if (!this.lock) {
          this.lock = true;
          requestAnimationFrame(() => {
            func(...args);
            this.lock = false;
          });
        }
      };
    },
    onScrollBottom() {
      const mainRef = this.$refs.commentMainRef;
      const scrollTop = mainRef.scrollTop;
      const containerHeight = mainRef.clientHeight;
      const scrollHeight = mainRef.scrollHeight;

      if (scrollTop + containerHeight >= scrollHeight) {
        this.loadComment(this.beRepliedCommentId);
      }
    },
    scrollEvent() {
      this.rafThrottle(this.onScrollBottom)();
    },
  },
};
</script>

<style scoped lang="scss">
.comment-container {
  display: flex;
  flex-direction: column;
  scrollbar-width: none;
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
      color: var(--text-color);
      -webkit-app-region: no-drag;
      cursor: pointer !important;
    }
    .btn.active {
      opacity: 1;
    }
  }
}

.conment-main {
  width: 100%;
  height: calc(100vh - 150px);
  overflow-y: scroll;
}

.comment-item {
  display: flex;
  width: 100%;
  padding-bottom: 4px;

  .avatar {
    cursor: pointer;
  }
  img {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    margin-right: 10px;
  }
}
.comment-item.first {
  padding-bottom: 10px;
  .comment-ex {
    padding-bottom: 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.5);
  }
}
.comment-info {
  display: flex;
  flex-direction: column;
  width: 100%;
}
.comment {
  width: auto;
  word-break: break-word;

  .comment-nickname {
    cursor: pointer;
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
  margin-top: 6px;
  padding-bottom: 10px;
  width: 100%;
  font-size: 14px;
  opacity: 0.7;
  text-align: center;
  justify-content: center;
  justify-content: space-between;

  .time-ip {
    display: flex;

    .time {
      margin-right: 6px;
    }
  }
  .comment-btns {
    display: flex;
    button {
      display: flex;
      margin-left: 10px;
      align-items: center;
      color: var(--color-text);

      svg {
        width: 16px;
        height: 16px;
        margin-right: 2px;
      }
    }
  }
}
.write-comment {
  padding-top: 6px;
}
</style>

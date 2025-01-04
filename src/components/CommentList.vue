<template>
  <div v-if="show" class="comment-container" :style="containerStyle">
    <div class="comment-head">
      <label>评论({{ commentInfo.totalCount }})</label>
      <div class="btns">
        <button
          class="btn"
          :class="{ active: commentInfo.sortType === 1 }"
          @click="handleClickSortType(1)"
          >推荐</button
        >
        <button
          class="btn"
          :class="{ active: commentInfo.sortType === 2 }"
          @click="handleClickSortType(2)"
          >最热</button
        >
        <button
          class="btn"
          :class="{ active: commentInfo.sortType === 3 }"
          @click="handleClickSortType(3)"
          >最新</button
        >
      </div>
    </div>
    <div ref="commentMainRef" class="conment-main" @scroll="scrollEvent">
      <div
        v-for="(item, index) in commentList"
        :id="`comment${index}`"
        :key="index"
        class="comment-item"
      >
        <div class="avatar">
          <img :src="getImage(item.user.avatarUrl)" alt="" loading="lazy"
        /></div>
        <div class="comment-info">
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
                @click="handleDeleteComment(item)"
                >删除</button
              >
              <button @click="handleLikeComment(item)"
                ><svg-icon :icon-class="item.liked ? 'liked' : 'like'" />{{
                  item.likedCount
                }}</button
              >
              <button
                v-show="!item.beReplied?.length"
                @click="switchCommentPage(item.commentId)"
                ><svg-icon icon-class="floor-comment" />{{
                  item.replyCount
                }}</button
              >
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="write-comment">
      <WriteComment
        placeholder="随乐而起，有感而发"
        @comment-submitted="handleSubmitComment"
      />
    </div>
  </div>
</template>

<script>
import { mapActions } from 'vuex';
import WriteComment from './WriteComment.vue';
import { getComment, likeComment, submitComment } from '@/api/comment';
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
  name: 'CommentList',
  components: {
    WriteComment,
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
      show: false,
      lock: false,
      commentList: [],
      commentInfo: {
        totalCount: 0,
        sortType: 1,
        paramType: 1,
        pageNo: 1,
        hasMore: true,
        cursor: 0,
        pageSize: 30,
      },
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
    beRepliedCommentId: {
      get() {
        return this.$parent.beRepliedCommentId;
      },
      set(value) {
        this.$parent.beRepliedCommentId = value;
      },
    },
    containerStyle() {
      return {
        height: this.type === 'mv' ? 'calc(100vh - 84px)' : '100vh',
        padding: this.type === 'mv' ? '0 0 0 3vh' : '40px 8vh 0 4vh',
      };
    },
    isAccountLoggedIn() {
      return isAccountLoggedIn();
    },
  },
  created() {
    this.loadComment();
    this.show = true;
  },
  methods: {
    ...mapActions(['showToast']),
    handleClickSortType(type) {
      this.commentInfo.sortType = type;
      this.commentInfo.paramType = type;
      this.commentInfo.pageNo = 1;
      this.commentList = [];
      this.commentInfo.hasMore = true;
      this.commentInfo.cursor = 0;
      this.loadComment();
    },
    getImage(url) {
      if (url.startsWith('http:')) {
        url = url.replace('http:', 'https:');
      }
      return url + '?param=64y64';
    },

    // hasMore为false，且对应的cursor是0时，表明当前的paramType下没有更多的评论了
    // 此时如果总评论数小于totalCount，则说明其他paramType下还有评论，需要切换到其他
    // paramType
    loadComment() {
      if (
        !this.commentInfo.hasMore &&
        this.commentInfo.cursor === (0 || '0') &&
        this.commentInfo.paramType === 3
      ) {
        return;
      }
      // 这里，需要检查是否需要切换到其他paramType来加载数据，逻辑是：
      // 当hasmore为false，cursor为0，且当前的评论不为0时，说明当前
      // 的paramType已经加载完毕了，需要切换到paramType为3来加载
      // 当切换到3时，需要把pageNo重置为1
      if (
        !this.commentInfo.hasMore &&
        this.commentInfo.cursor === (0 || '0') &&
        this.commentList.length > 0
      ) {
        this.commentInfo.paramType = 3;
        this.commentInfo.pageNo = 1;
      }

      const params = {
        id: this.id,
        type: typeMap[this.type],
        sortType: this.commentInfo.paramType,
        pageNo: this.commentInfo.pageNo,
        pageSize: this.commentInfo.pageSize,
        cursor: this.commentInfo.cursor,
      };
      getComment(params).then(res => {
        if (res.code === 200) {
          this.commentInfo.totalCount =
            res.data.totalCount || this.commentInfo.totalCount;
          this.commentInfo.hasMore = res.data.hasMore;
          this.commentInfo.pageNo++;
          this.commentInfo.cursor = res.data.cursor;
          this.commentList.push(...res.data.comments);
        }
      });
    },
    handleSubmitComment(text) {
      if (!isAccountLoggedIn()) {
        this.showToast(locale.t('toast.needToLogin'));
        return;
      }
      submitComment({
        t: 1,
        type: typeMap[this.type],
        id: this.id,
        content: text,
      })
        .then(res => {
          if (res.code === 200) {
            const comment = res.comment;
            comment.liked = false;
            comment.likedCount = 0;
            comment.replyCount = 0;
            this.commentList.unshift(comment);
            this.commentInfo.totalCount++;
          } else {
            this.showToast(`${res.message}，${res.data?.dialog?.subtitle}`);
          }
        })
        .catch(err => {
          this.showToast(err);
        });
    },
    handleDeleteComment(item) {
      if (!isAccountLoggedIn()) {
        this.showToast(locale.t('toast.needToLogin'));
        return;
      }
      if (confirm(`确定删除评论${item.content}吗？`)) {
        const params = {
          t: 0,
          type: typeMap[this.type],
          id: this.id,
          commentId: item.commentId,
        };
        submitComment(params)
          .then(res => {
            if (res.code === 200) {
              this.commentList = this.commentList.filter(c => c !== item);
              this.commentInfo.totalCount--;
            } else {
              this.showToast(res);
            }
          })
          .catch(err => {
            this.showToast(err);
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
            item.likedCount += item.liked ? -1 : 1;
            item.liked = !item.liked;
          } else {
            this.showToast(res.msg + res?.data?.dialog?.subtitle);
          }
        })
        .catch(err => {
          this.showToast(err);
        });
    },
    switchCommentPage(id) {
      this.beRepliedCommentId = id;
      this.currentPage = 'floorComment';
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
        this.loadComment();
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

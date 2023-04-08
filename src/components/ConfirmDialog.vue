<template>
  <div v-show="isShow" class="confirm-dialog">
    <div class="dialog">
      <div class="title">{{ title }}</div>
      <div class="content">{{ content }}</div>
      <div class="buttons">
        <button class="confirm-button" @click="confirm">确认</button>
        <button class="cancel-button" @click="cancel">取消</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ConfirmDialog',
  data() {
    return {
      isShow: false,
      operation: 'comment',
      title: '',
      content: '',
    };
  },
  created() {
    this.$parent.Bus.$on('showConfirm', data => {
      this.operation = data.operation;
      this.title = data.title;
      this.content = data.comment.content;
      this.comment = data.comment;
      this.type = data.type;
      this.isShow = true;
    });
  },
  methods: {
    hideConfirm() {
      this.show = false;
    },
    confirm() {
      this.isShow = false;
      if (this.operation === 'comment') {
        this.$parent.Bus.$emit('Confirm', {
          code: 'ok',
          comment: this.comment,
          type: this.type,
        });
      } else if (this.operation === 'floor') {
        this.$parent.Bus.$emit('FloorConfirm', {
          code: 'ok',
          comment: this.comment,
          type: this.type,
        });
      }
    },
    cancel() {
      this.isShow = false;
      return Promise.resolve(false);
    },
  },
};
</script>

<style scoped>
.confirm-dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.4);
  /* background: rgba(var(--color-body-bg), 0.5); */
  z-index: 10000000000;
}

.dialog {
  width: 300px;
  color: var(--color-text);
  background: var(--color-body-bg);
  border-radius: 12px;
  overflow: hidden;
}

.title {
  padding: 16px;
  font-size: 18px;
  font-weight: bold;
  text-align: center;
}

.content {
  padding: 16px;
  font-size: 16px;
  text-align: center;
}

.buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.confirm-button {
  padding: 8px 16px;
  background-color: #409eff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 25px;
}

.cancel-button {
  padding: 8px 16px;
  background-color: #909399;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-left: 25px;
}
</style>

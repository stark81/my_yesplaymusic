<template>
  <div v-show="isShow" class="confirm-dialog">
    <div class="dialog">
      <div class="title">{{ title }}</div>
      <div v-if="content" class="content">{{ content }}</div>
      <div v-if="operation === 'delayTime'" class="input-container">
        <input
          v-model="inputValue"
          class="inputdiv"
          type="text"
          placeholder="正数为延后，负数为提前"
          @input="handleInput"
        />
      </div>
      <div v-if="!isValidNumber" class="hint">输入不是有效的数字</div>
      <div class="buttons">
        <button class="confirm-button" @click="confirm">确认</button>
        <button class="cancel-button" @click="cancel">取消</button>
      </div>
    </div>
  </div>
</template>

<script>
import nativeAlert from '@/utils/nativeAlert';
import { mapMutations } from 'vuex';

export default {
  name: 'ConfirmDialog',
  data() {
    return {
      isShow: false,
      operation: 'comment',
      title: '',
      content: null,
      comment: null,
      type: null,
      trackID: null,
      inputValue: null,
      isValidNumber: true,
    };
  },
  created() {
    this.$parent.Bus.$on('showConfirm', data => {
      this.operation = data.operation;
      this.title = data.title;
      this.content = data.comment ? data.comment.content : null;
      this.comment = data.comment;
      this.type = data.type;
      this.filePath = data.filePath;
      this.isShow = true;
    });
  },
  methods: {
    ...mapMutations(['setDelayTime']),
    hideConfirm() {
      this.show = false;
    },
    handleInput() {
      const value = Number(this.inputValue);
      if (isNaN(value)) {
        this.isValidNumber = false;
      } else {
        this.isValidNumber = true;
      }
    },
    confirm() {
      if (this.operation === 'comment') {
        this.$parent.Bus.$emit('Confirm', {
          code: 'ok',
          comment: this.comment,
          type: this.type,
        });
        this.isShow = false;
      } else if (this.operation === 'floor') {
        this.$parent.Bus.$emit('FloorConfirm', {
          code: 'ok',
          comment: this.comment,
          type: this.type,
        });
        this.isShow = false;
      } else if (this.operation === 'delayTime') {
        if (this.isValidNumber) {
          this.setDelayTime({
            filePath: this.filePath,
            delayTime: this.inputValue,
          });
          this.isShow = false;
          this.inputValue = '';
        } else {
          nativeAlert('输入的值不是数字');
        }
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
  background: var(--color-body-bg-alpha);
  border-radius: 12px;
  overflow: hidden;
}

.title {
  padding: 16px;
  font-size: 18px;
  font-weight: bold;
  text-align: center;
}
.hint {
  text-align: center;
  font-size: 12px;
  margin-top: 10px;
  color: red;
}

.content {
  padding: 16px;
  font-size: 16px;
  text-align: center;
}

.input-container {
  display: flex;
  justify-content: center; /* 水平居中 */
  align-items: center; /* 垂直居中 */
}

.inputdiv {
  height: 30px;
  width: 200px;
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

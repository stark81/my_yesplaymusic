import eventBus from './eventBus';
import store from '@/store';
const player = store.state.player;

export class Canvas {
  constructor({ width = 195, height = 22, devicePixelRatio = 1 }) {
    this.w = width;
    this.h = height;
    this.devicePixelRatio = devicePixelRatio;
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.w * this.devicePixelRatio;
    this.canvas.height = this.h * this.devicePixelRatio;
    this.ctx = this.canvas.getContext('2d');
  }
}

export class Control extends Canvas {
  constructor(imageList, singleWidth = 22) {
    super({ width: singleWidth * imageList.length, devicePixelRatio: 2 });
    this.ctx.textBaseline = 'middle';
    this.singleWidth = singleWidth;
    this.imageList = imageList;
  }

  async draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (let index in this.imageList) {
      const item = this.imageList[index];
      await this.drawImage(index, item);
    }
    eventBus.$emit('control-draw');
  }

  drawImage(index, item) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        this.ctx.drawImage(
          img,
          this.singleWidth * index * this.devicePixelRatio,
          this.canvas.height / 2 - img.height / 2
        );
        resolve();
      };
      img.src = item;
    });
  }

  updateImage(index, image) {
    this.imageList[index] = image;
  }
}

export class Lyric extends Canvas {
  constructor({ width = 195, height = 22, fontSize = 14 } = {}) {
    super({ width, height, devicePixelRatio: 2 });
    this.fontSize = fontSize;
    this.allLyric = null;
    this.lyric = {
      text: player.currentTrack.name || '听你想听的音乐',
      width: 0,
      time: 0, // 单句歌词的播放时间
    };
    this.x = 0; // 移动的距离
    this.timerId = null;
    this.timer = null;
    this.frame = 34; // 歌词滚动的帧率
    this.ctx.font = `${
      this.fontSize * this.devicePixelRatio
    }px "pingfang sc", "microsoft yahei", sans-serif`;
    this.ctx.textBaseline = 'middle';
    // this.findCurrentLyric();
  }
  findCurrentLyric() {
    const lyricDelay = Number(player.currentTrack.lyricDelay || 0);
    const progress = player.seek() + lyricDelay ?? 0;
    let currentIndex = this.allLyric?.findIndex((l, index) => {
      const nextLyric = this.allLyric[index + 1];
      return (
        progress >= l.time && (nextLyric ? progress < nextLyric.time : true)
      );
    });
    if (this.allLyric && currentIndex !== -1) {
      const currentLyric = this.allLyric[currentIndex];
      let currentLyricTime = 0;
      if (currentIndex === this.allLyric.length - 1) {
        currentLyricTime = 10 * 1000;
      } else {
        currentLyricTime =
          this.allLyric[currentIndex + 1].time * 1000 -
          this.allLyric[currentIndex].time * 1000;
      }
      const arg = {
        text: currentLyric.content,
        width: 0,
        time: currentLyricTime,
      };
      if (this.lyric.text != arg.text) {
        this.lyric = arg;
        this.updateLyric(this.lyric);
      }
    }
    this.timerId = setTimeout(this.findCurrentLyric.bind(this), 100);
  }

  updateLyric(arg = this.lyric) {
    clearInterval(this.timer);
    this.x = 0;
    const measureText = this.ctx.measureText(arg.text);
    this.lyric = {
      text: arg.text,
      width: measureText.width,
      time: arg.time,
    };
    if (this.lyric.width > this.canvas.width) {
      // 计算第一屏文字占总文字长度的比率
      const rate = this.canvas.width / this.lyric.width;
      // 根据比率计算出第一屏文字静止的时间
      const staticTime = Math.min(rate * this.lyric.time, 2000);
      // 渲染第一屏文字
      this.draw();
      // 延时move
      setTimeout(() => {
        // 开始移动
        this.timer = setInterval(() => {
          this.move();
          this.draw();
        }, 1000 / this.frame);
      }, staticTime);
      // 取消
      setTimeout(() => {
        clearInterval(this.timer);
      }, this.lyric.time);
    } else {
      this.draw();
    }
  }

  move() {
    // 计算文字超出canvas的部分
    const more = this.lyric.width - this.canvas.width;
    // 文字右侧没有到canvas右侧
    if (-this.x < more) {
      // 计算超出文字占总文字长度的比率
      const rate = more / this.lyric.width;
      // 根据比率 计算出超出文字滚动需要的时间
      const scrollTime = rate * this.lyric.time;
      // 根据时间 计算出每帧需要移动的距离
      const distance =
        (more / Math.max(this.lyric.time - 2000, scrollTime)) * this.frame;
      this.x -= distance * this.devicePixelRatio;
    } else {
      clearInterval(this.timer);
    }
  }

  draw() {
    let x;
    if (this.lyric.width <= this.canvas.width) {
      x = this.canvas.width / 2;
      this.ctx.textAlign = 'center';
    } else {
      x = this.x;
      this.ctx.textAlign = 'left';
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillText(this.lyric.text, x, this.canvas.height / 2 + 1);
    eventBus.$emit('lyric-draw');
  }
}

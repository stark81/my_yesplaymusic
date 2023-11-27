import Vue from 'vue';
import i18n from '@/locale';
import OsdLyric from './views/osdLyric.vue';

new Vue({
  i18n,
  render: h => h(OsdLyric),
}).$mount('#root');

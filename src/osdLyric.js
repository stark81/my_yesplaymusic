import Vue from 'vue';
import App from './LyricWin.vue';
import store from './storeOsd';
import '@/assets/icons';

new Vue({ store, render: h => h(App) }).$mount('#lyricRoot');

import Vue from 'vue';
import Vuex from 'vuex';

Vue.use(Vuex);

const getLocalStorageState = () => {
  const state = localStorage.getItem('osd-lyric');
  if (state) {
    return {
      osd: JSON.parse(state),
    };
  }
  return {
    osd: {
      type: 'normal',
      isLock: false,
      fontColor: 'white',
    },
  };
};

const store = new Vuex.Store({
  state: getLocalStorageState(),
  mutations: {
    updateSettings(state, { key, value }) {
      state.osd[key] = value;
    },
  },
  actions: {},
  plugins: [
    store => {
      store.subscribe((mutation, state) => {
        localStorage.setItem('osd-lyric', JSON.stringify(state.osd));
      });
    },
  ],
});

export default store;

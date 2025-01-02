export default store => {
  store.subscribe((mutation, state) => {
    localStorage.setItem('settings', JSON.stringify(state.settings));
    localStorage.setItem('data', JSON.stringify(state.data));
    localStorage.setItem('localMusic', JSON.stringify(state.localMusic));
  });
};

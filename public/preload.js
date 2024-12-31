const { ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
  let timeoutId = null;
  let lastMoveTime = 0;

  const container = document.querySelector('.container');
  const header = document.querySelector('.header');
  const lockElement = document.querySelector('#osd-lock');
  const root = document.querySelector('#lyricRoot');

  container.addEventListener('mouseenter', () => {
    header.style.opacity = 1;
  });

  container.addEventListener('mouseleave', () => {
    header.style.opacity = 0;
    root.style.opacity = '1';
  });

  header.addEventListener('mouseenter', () => {
    header.style.opacity = 1;
  });

  header.addEventListener('mouseleave', () => {
    header.style.opacity = 0;
  });

  root.addEventListener('mouseenter', () => {
    if (lockElement) {
      lockElement.style.opacity = '1';
    }
  });

  root.addEventListener('mousemove', () => {
    if (!root.classList.contains('is-lock')) return;
    clearTimeout(timeoutId);

    lastMoveTime = Date.now();
    timeoutId = setTimeout(() => {
      const now = Date.now();
      if (now - lastMoveTime >= 1500) {
        root.style.opacity = '0.05';
      }
    }, 1500);
  });

  root.addEventListener('mouseleave', () => {
    clearTimeout(timeoutId);
    if (!lockElement) return;
    lockElement.style.opacity = '0';
  });

  lockElement.addEventListener('mouseenter', () => {
    ipcRenderer.send('set-ignore-mouse', false);
  });

  lockElement.addEventListener('mouseleave', () => {
    ipcRenderer.send('mouseleave');
  });
});

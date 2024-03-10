import defaultShortcuts from '@/utils/shortcuts';
const { app, Menu, ipcMain } = require('electron');

var isPlaying = false;

const isMac = process.platform === 'darwin';

export function createMenu(win, store) {
  let shortcuts = store.get('settings.shortcuts');
  if (shortcuts === undefined) {
    shortcuts = defaultShortcuts;
  }

  let menu = null;
  const updateMenu = () => {
    const template = [
      ...(isMac
        ? [
            {
              label: app.name,
              submenu: [
                { role: 'about', label: '关于' + app.name },
                { type: 'separator' },
                { role: 'services', label: '服务' },
                { type: 'separator' },
                { type: 'separator' },
                {
                  label: '偏好设置...',
                  accelerator: 'CmdOrCtrl+,',
                  click: () => {
                    win.webContents.send('changeRouteTo', '/settings');
                  },
                  role: 'preferences',
                },
                { type: 'separator' },
                { role: 'hide', label: '隐藏' },
                { role: 'hideothers', label: '隐藏所有' },
                { role: 'unhide', label: '显示全部' },
                { type: 'separator' },
                { role: 'quit', label: '退出' },
              ],
            },
          ]
        : []),
      {
        label: '编辑',
        submenu: [
          { role: 'undo', label: '撤销' },
          { role: 'redo', label: '恢复' },
          { type: 'separator' },
          { role: 'cut', label: '剪切' },
          { role: 'copy', label: '复制' },
          { role: 'paste', label: '粘贴' },
          ...(isMac
            ? [
                { role: 'delete', label: '删除' },
                { role: 'selectAll', label: '删除所有' },
                { type: 'separator' },
                {
                  label: '听写',
                  submenu: [
                    { role: 'startspeaking', label: '开始听写' },
                    { role: 'stopspeaking', label: '停止听写' },
                  ],
                },
              ]
            : [
                { role: 'delete', label: '删除' },
                { type: 'separator' },
                { role: 'selectAll', label: '删除所有' },
              ]),
          {
            label: '搜索',
            accelerator: 'CmdOrCtrl+F',
            click: () => {
              win.webContents.send('search');
            },
          },
        ],
      },
      {
        label: '控制',
        submenu: [
          {
            label: isPlaying ? '暂停' : '播放',
            accelerator: shortcuts.find(s => s.id === 'play').shortcut,
            click: () => {
              win.webContents.send('play');
            },
          },
          {
            label: '下一首',
            accelerator: shortcuts.find(s => s.id === 'next').shortcut,
            click: () => {
              win.webContents.send('next');
            },
          },
          {
            label: '上一首',
            accelerator: shortcuts.find(s => s.id === 'previous').shortcut,
            click: () => {
              win.webContents.send('previous');
            },
          },
          {
            label: '增大音量',
            accelerator: shortcuts.find(s => s.id === 'increaseVolume')
              .shortcut,
            click: () => {
              win.webContents.send('increaseVolume');
            },
          },
          {
            label: '降低音量',
            accelerator: shortcuts.find(s => s.id === 'decreaseVolume')
              .shortcut,
            click: () => {
              win.webContents.send('decreaseVolume');
            },
          },
          {
            label: '喜欢',
            accelerator: shortcuts.find(s => s.id === 'like').shortcut,
            click: () => {
              win.webContents.send('like');
            },
          },
          {
            label: '重复',
            accelerator: 'Alt+R',
            click: () => {
              win.webContents.send('repeat');
            },
          },
          {
            label: '随机',
            accelerator: 'Alt+S',
            click: () => {
              win.webContents.send('shuffle');
            },
          },
        ],
      },
      {
        label: '窗口',
        submenu: [
          { role: 'close', label: '关闭' },
          { role: 'minimize', label: '最小化' },
          { role: 'zoom', label: '最大化' },
          { role: 'reload', label: '重新加载' },
          { role: 'forcereload', label: '强制重新加载' },
          { role: 'toggledevtools', label: '开发者工具' },
          { type: 'separator' },
          { role: 'togglefullscreen', label: '切换全屏' },
          ...(isMac
            ? [
                { type: 'separator' },
                { role: 'front', label: '全部置于顶层' },
                { type: 'separator' },
                {
                  role: 'window',
                  id: 'window',
                  label: 'YesPlayMusic',
                  type: 'checkbox',
                  checked: true,
                  click: () => {
                    const current = menu.getMenuItemById('window');
                    if (current.checked === false) {
                      win.hide();
                    } else {
                      win.show();
                    }
                  },
                },
              ]
            : [{ role: 'close' }]),
        ],
      },
      {
        label: '帮助',
        submenu: [
          {
            label: 'GitHub',
            click: async () => {
              const { shell } = require('electron');
              await shell.openExternal(
                'https://github.com/stark81/my_yesplaymusic/'
              );
            },
          },
          {
            label: 'Electron',
            click: async () => {
              const { shell } = require('electron');
              await shell.openExternal('https://electronjs.org');
            },
          },
          {
            label: '开发者工具',
            accelerator: 'F12',
            click: () => {
              win.webContents.openDevTools();
            },
          },
        ],
      },
    ];
    menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  };
  updateMenu();

  ipcMain.on('updateTrayPlayState', (_, playing) => {
    isPlaying = playing;
    updateMenu();
  });
}

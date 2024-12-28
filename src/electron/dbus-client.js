class ServiceMonitor {
  constructor(busName, win) {
    this.interfaceName = 'org.freedesktop.DBus';
    this.objectPath = '/org/freedesktop/DBus';
    this.busName = busName;
    this.status = false;
    this.win = win;
    this.iface = null;
    this.sessionBus = require('dbus-native').sessionBus();
    this.watchName();
  }

  watchName() {
    this.sessionBus.getInterface(
      this.interfaceName,
      this.objectPath,
      this.interfaceName,
      (err, iface) => {
        if (err) {
          console.error('error getting interface:', err);
          return;
        }
        iface.on('NameOwnerChanged', (name, oldOwner, newOwner) => {
          if (name === this.busName) {
            const isRunning = !!newOwner;

            if (isRunning) {
              this.onOwnerName();
            } else {
              this.onLostOwnerName();
            }
          }
        });

        iface.GetNameOwner(this.busName, err => {
          if (err) {
            this.onLostOwnerName();
          } else {
            this.onOwnerName();
          }
        });
      }
    );
  }

  onOwnerName() {
    const path = `/${this.busName.replace(/\./g, '/')}`;
    this.sessionBus
      .getService(this.busName)
      .getInterface(path, this.busName, (err, iface) => {
        if (err) {
          console.error('error getting interface:', err);
          this.status = false;
          this.win.webContents.send('dbus-status', this.status);
          return;
        }

        this.iface = iface;
        this.status = true;
        this.win.webContents.send('dbus-status', this.status);
      });
  }

  onLostOwnerName() {
    this.status = false;
    this.win.webContents.send('dbus-status', this.status);
  }
}

export const createDBus = (busName, win) => {
  return new ServiceMonitor(busName, win);
};

import { app, BrowserWindow, Menu, MenuItem } from 'electron';
import { join } from 'node:path';
import { platform } from 'node:process';
import { applySecurityRestrictions } from './security-restrictions';
import { CONTEXT } from './context';
import { ProvidersBuilder } from './providers-builder';
import { DateTime } from 'luxon';

export const DEV_SERVE_URL = 'http://localhost:4200';
const isProd = !CONTEXT.isDevEnvironment;
const isServe = process.argv.slice(1).some(val => val === '--serve');

console.log('====================================================== Starting app ======================================================');
console.log(DateTime.now().toISO());


(async () => {
  try {
    await ProvidersBuilder.initProviders();
    ProvidersBuilder.prepareProviders();
  } catch (e) {
    console.error('Error init providers ', e);
  }
})();


// if (!isProd) {
//   app.commandLine.appendSwitch('remote-debugging-port', '8315');
// }

applySecurityRestrictions(DEV_SERVE_URL);

/**
 * Prevent electron from running multiple instances.
 */
const isSingleInstance = app.requestSingleInstanceLock();
if (!isSingleInstance) {
  app.quit();
  process.exit(0);
}
app.on('second-instance', restoreOrCreateWindow);


/**
 * Disable Hardware Acceleration to save more system resources.
 */
app.disableHardwareAcceleration();
/**
 * Shout down background process if all windows was closed
 */
app.on('window-all-closed', () => {
  if (platform !== 'darwin') {
    app.quit();
  }
});

/**
 * @see https://www.electronjs.org/docs/latest/api/app#event-activate-macos Event: 'activate'.
 */
app.on('activate', restoreOrCreateWindow);

/**
 * Create the application window when the background process is ready.
 */
app
  .whenReady()
  .then(restoreOrCreateWindow)
  .catch(e => console.error('Failed create window:', e));

/**
 * Install Vue.js or any other extension in development mode only.
 * Note: You must install `electron-devtools-installer` manually
 */
// if (import.meta.env.DEV) {
//   app
//     .whenReady()
//     .then(() => import('electron-devtools-installer'))
//     .then(module => {
//       const {default: installExtension, VUEJS3_DEVTOOLS} =
//         // @ts-expect-error Hotfix for https://github.com/cawa-93/vite-electron-builder/issues/915
//         typeof module.default === 'function' ? module : (module.default as typeof module);
//
//       return installExtension(VUEJS3_DEVTOOLS, {
//         loadExtensionOptions: {
//           allowFileAccess: true,
//         },
//       });
//     })
//     .catch(e => console.error('Failed install extension:', e));
// }

/**
 * Check for app updates, install it in background and notify user that new version was installed.
 * No reason run this in non-production build.
 *
 * @see https://www.electron.build/auto-update.html#quick-setup-guide
 *
 * Note: It may throw "ENOENT: no such file app-update.yml"
 * if you compile production app without publishing it to distribution server.
 * Like `npm run compile` does. It's ok 😅
 */
if (isProd) {
  app.setAppUserModelId('SKanban');
  app
    .whenReady()
    .then(() => import('electron-updater'))
    .then(module => {
      const autoUpdater =
        module.autoUpdater ||
        // @ts-expect-error Hotfix for https://github.com/electron-userland/electron-builder/issues/7338
        (module.default.autoUpdater as (typeof module)['autoUpdater']);
      return autoUpdater.checkForUpdatesAndNotify();
    })
    .catch(e => console.error('Failed check and install updates:', e));
}


async function createWindow() {
  const browserWindow = new BrowserWindow({
    show: false, // Use the 'ready-to-show' event to show the instantiated BrowserWindow.
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // Sandbox disabled because the demo of preload script depend on the Node.js api
      // The webview tag is not recommended. Consider alternatives like an iframe or Electron's BrowserView.
      // @see https://www.electronjs.org/docs/latest/api/webview-tag#warning
      webviewTag: false,
      preload: join(app.getAppPath(), 'dist/main/src/preload/preload.js'),
    },
  });


  /**
   * If the 'show' property of the BrowserWindow's constructor is omitted from the initialization options,
   * it then defaults to 'true'. This can cause flickering as the window loads the html content,
   * and it also has show problematic behaviour with the closing of the window.
   * Use `show: false` and listen to the  `ready-to-show` event to show the window.
   *
   * @see https://github.com/electron/electron/issues/25012 for the afford mentioned issue.
   */
  browserWindow.on('ready-to-show', () => {
    const s = Menu.getApplicationMenu();
   s.append(new MenuItem({
     type: 'submenu',
      label: 'SKanban', id: 'test',
     submenu: [
       {
         type: 'normal',
         label: 'Test notifications',
         click: (m, b, e) => ProvidersBuilder.notification.show({
           body: 'Body text send at ' + new Date().toLocaleString(),
           title: 'Test title'
         }),
       }
     ]
    }));
    Menu.setApplicationMenu(s);

    browserWindow?.show();

    if (!isProd) {
      browserWindow?.webContents.openDevTools();
    }
  });

  /**
   * URL for main window.
   * Vite dev server for development.
   * `file://../renderer/index.html` for production and test.
   */
  const pageUrl = isServe ? DEV_SERVE_URL : new URL('../../index.html', 'file://' + __dirname).toString();
  ProvidersBuilder.window = browserWindow;
  await browserWindow.loadURL(pageUrl);

  return browserWindow;
}

/**
 * Restore an existing BrowserWindow or Create a new BrowserWindow.
 */
export async function restoreOrCreateWindow() {
  let window = BrowserWindow.getAllWindows().find(w => !w.isDestroyed());

  if (window === undefined) {
    window = await createWindow();
  }

  if (window.isMinimized()) {
    window.restore();
  }

  if (!isProd) {
    window.focus();
  }
}

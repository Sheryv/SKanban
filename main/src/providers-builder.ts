import { CONTEXT } from './context';
import { DatabaseProvider } from './provider/database-provider';
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import * as path from 'path';
import { FileSyncProvider } from './provider/file-sync-provider';
import { IpcConfig, Ipcs, Job, Shell } from '../../renderer/src/shared/model/ipcs';
import { DbOperation } from '../../renderer/src/shared/model/db';
import { Utils } from '../../renderer/src/shared/util/utils';
import { NotificationProvider } from './provider/notification-provider';

//    "!**/*",

// {
//   "from": "renderer/dist/assets",
//   "filter": [
//   "**/*"
// ],
//   "to": "resources/assets"
// }


// ,
// {
//   "glob": "**/*",
//   "input": "node_modules/monaco-editor",
//   "output": "./assets/monaco/"
// }

export class ProvidersBuilder {
  private static readonly dbp = new DatabaseProvider();
  private static readonly files = new FileSyncProvider(ProvidersBuilder.dbp);
  private static readonly notification = new NotificationProvider(ProvidersBuilder.dbp);

  static window: BrowserWindow;

  static async initProviders(): Promise<any> {
    await this.dbp.init();
    this.notification.init();
  }

  static prepareProviders() {
    console.log('Running in DEV env: ', CONTEXT.isDevEnvironment);

    ipcMain.handle(Ipcs.DB.channel, (event, args: DbOperation) => {
      const fun = args.type;
      const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(this.dbp)).filter(k => typeof this.dbp[k] === 'function');

      if (!methods.some(m => m === fun)) {
        throw Error(`Method ${fun} not found for type 'dbp'. Available: [${methods.join(', ')}]`);
      }

      return this.dbp[fun](args);
    });


    ipcMain.handle(Ipcs.SHELL.channel, async (event, args: Shell) => {
      switch (args.op) {
        case 'showItemInFolder':
          if (args.name === Ipcs.SHELL_SHOW_ITEM_IN_FOLDER.showDbFile) {
            const fullPath = path.join(path.dirname(app.getPath('exe')), Utils.DB_NAME);
            if (CONTEXT.isDevEnvironment) {
              console.log('showing file ', fullPath);
            }
            shell.showItemInFolder(fullPath);
          }
          break;

        case 'showOpenFileDialog':
          return await this.files.openFileDialog(args.defaultPath);
        case 'showSaveFileDialog':
          return await this.files.saveFileDialog(args.defaultPath);
        case 'showNotification':
          return await this.notification.show(args.options);
        case 'flashFrame':
          return this.flashFrame();
        case 'bringWindowToTop':
          console.log('bringWindowToTop');
          this.window.hide();
          return this.window.show();
      }
    });

    ipcMain.handle(Ipcs.JOB.channel, async (event, args: Job) => {
      switch (args.op) {
        case 'import':
          if (await this.files.import(args.boardId)) {
            ProvidersBuilder.sendToWindow(Ipcs.EVENT, {op: 'refreshBoard', boardId: args.boardId});
            return true;
          }
          return false;
        case 'enableSync':
          return await this.files.enableSync(args.listId, args.path, boardId => ProvidersBuilder.sendToWindow(Ipcs.EVENT, {
            op: 'refreshBoard',
            boardId,
          }));
        case 'export':
          return await this.files.export(args.path, args.listId);
        case 'disableAllSync':
          return await this.files.disableAllSync();
        case 'disableSync':
          return await this.files.disableSync(args.listId);
      }
    });
  }

  private static sendToWindow<I, O>(config: IpcConfig<I, O>, request: I) {
    this.window.webContents.send(config.channel, request);
  }

  private static flashFrame() {
    this.window.once('focus', () => this.window.flashFrame(false));
    this.window.flashFrame(true);
  }
}



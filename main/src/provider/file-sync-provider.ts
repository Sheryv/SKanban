import { TaskFileImporter } from './task-file-importer';
import { FSWatcher, watch, WatchEventType } from 'fs';
import { dialog } from 'electron';
import { DatabaseProvider } from './database-provider';
import { TaskFileExporter } from './task-file-exporter';
import { TaskList } from '../../../renderer/src/shared/model/entity/task-list';

export class FileSyncProvider {

  private handlers: { watcher: FSWatcher, list: number, enabled: boolean }[] = [];

  constructor(private db: DatabaseProvider) {
  }

  async enableSync(listId: number, path: string | null, callback: (boardId: number) => void) {
    if (!path) {
      path = await this.db.find({table: 'lists', findId: listId}).then(r => (r.rows[0] as TaskList).synchronized_file);
    }

    if (path && this.handlers.every(h => h.list != listId)) {
      const watcher = watch(path, {
        persistent: false,
        recursive: false,
      }, async (event: WatchEventType, filename: string) => {
        if (event === 'change') {
          await this.handleAsyncFileChangeEvent(listId, path, callback);
        }
      });

      this.handlers.push({
        list: listId,
        enabled: true,
        watcher,
      });
      await this.handleAsyncFileChangeEvent(listId, path, callback);
    }
  }


  private async handleAsyncFileChangeEvent(listId: number, path: string, callback: (boardId: number) => void) {
    let handler = this.handlers.find(h => h.list === listId);
    if (handler) {
      if (handler.enabled) {
        handler.enabled = false;
        let importer = new TaskFileImporter(path, this.db);
        const tasks = await importer.load();
        const list = await this.db.find({table: 'lists', findId: listId}).then(r => r.rows[0]);
        const savedTasks = await importer.saveToDb({id: listId, boardId: list.board_id, name: list.title}, tasks.tasks);

        // const newPath = nodePath.join(nodePath.dirname(path), nodePath.basename(path, nodePath.extname(path)) + '-2' + nodePath.extname(path));
        await this.export(path, listId);
        callback(list.board_id);
        setTimeout(() => handler.enabled = true, 750);
      } else {
        console.log(`Skipped save of list ${listId} when file changed because it is on cooldown`);
        // console.log('Queued file sync because it disabled now - load for list', listId);
        // setTimeout(async () => {
        //   if (handler.enabled) {
        //     await this.handleAsyncFileChangeEvent(listId, path, callback);
        //   }
        //   // handler.enabled = true
        // }, 1000);
      }
    }
  }

  async import(boardId: number): Promise<boolean> {
    const path = await this.openFileDialog();
    if (path) {
      let importer = new TaskFileImporter(path, this.db);
      const tasks = await importer.load();
      await importer.saveToDb({boardId: boardId, name: tasks.list}, tasks.tasks);
      return true;
    }
    return false;
  }


  async export(path: string, listId: number): Promise<any> {
    console.log('saving file ', path)
    let exporter = new TaskFileExporter(this.db);
    await exporter.export(path, await exporter.loadFromDb(listId));
  }

  async disableSync(listId: number) {
    const h = this.handlers;
    h.splice(h.findIndex(e => e.list === listId), 1);
  }

  async disableAllSync() {
    const h = this.handlers;
    this.handlers = [];
    h.forEach(h => h.watcher.close());
  }

  async saveFileDialog(defaultPath: string = null): Promise<string | null> {
    const options = defaultPath && {defaultPath} || {};
    const selected = await dialog.showSaveDialog(options);

    if (selected && !selected.canceled && selected.filePath) {
      return selected.filePath;
    }
    return null;
  }

  async openFileDialog(defaultPath: string = null): Promise<string | null> {
    const options = defaultPath && {defaultPath} || {};

    const f = await dialog.showOpenDialog({properties: ['openFile'], ...options});

    if (!f.canceled) {
      console.log(f.filePaths[0]);
      return f.filePaths[0];
    } else {
      console.log('no file selected');
    }
    return null;
  }
}

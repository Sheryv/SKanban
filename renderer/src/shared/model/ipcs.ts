import { DbOperation, DbResult } from './db';
import { NotificationTemplate } from './notification';

export type IpcConfig<I, O> = { channel: string }

export type Shell =
  { op: 'showItemInFolder', name: string }
  | { op: 'showSaveFileDialog', defaultPath?: string }
  | { op: 'showOpenFileDialog', defaultPath?: string }
  | { op: 'showNotification', options: NotificationTemplate }
  | { op: 'flashFrame' }

export type Job =
  { op: 'import', boardId: number }
  | { op: 'export', listId: number, path: string }
  | { op: 'enableSync', listId: number, path?: string }
  | { op: 'disableAllSync' }
  | { op: 'disableSync', listId: number }

export type Event = { op: 'refreshBoard', boardId: number } | { op: 'updateTask', taskId: number }

export class Ipcs {

  static DB: IpcConfig<DbOperation, DbResult> = {channel: 'db'};
  static SHELL: IpcConfig<Shell, string | null> = {channel: 'shell'};
  static JOB: IpcConfig<Job, any> = {channel: 'job'};
  static EVENT: IpcConfig<Event, any> = {channel: 'event'};

  static SHELL_SHOW_ITEM_IN_FOLDER = {
    showDbFile: 'showDbFile',
  };
}

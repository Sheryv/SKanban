import { ipcRenderer, remote, webFrame, app } from 'electron';
import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export class Context {
  static readonly IPC_RENDERER: typeof ipcRenderer = ipcRenderer;
  static readonly WEB_FRAME: typeof webFrame = webFrame;
  static readonly CHILD_PROCESS: typeof childProcess = childProcess;
  static readonly FS: typeof fs = fs;
  static readonly PATH: typeof path = path;
  static readonly APP: typeof app = app;
}

import { contextBridge, ipcRenderer, shell, app } from 'electron';
import { NodeCtx } from '../../../renderer/src/shared/node-ctx';

const context: NodeCtx = {
  isDevEnvironment: process.env.MODE === 'dev',
  versions: {
    app: process.env.npm_package_version,
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
  openLink: (link: string) => {
    try {
      const url = new URL(link);
      shell.openExternal(url.href);
    } catch (e) {
      console.error('Incorrect url ' + link, e);
    }
  },
  sendAsyncEventToMain: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
  eventStreamFromMain: (channel, callback: (data: { event; args: any[] }) => void) => {
    ipcRenderer.on(channel, (event, arg) => {
      callback({event: {senderId: event.senderId}, args: arg as any[]});
    });
  },
};

contextBridge.exposeInMainWorld('NODE_CTX', context);

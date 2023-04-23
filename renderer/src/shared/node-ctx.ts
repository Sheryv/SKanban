export type NodeCtx = {
  isDevEnvironment: boolean;
  versions: {
    app: string;
    chrome: string;
    node: string;
    electron: string;
  };
  openLink: (link: string) => void;
  eventStreamFromMain: (channel: string, callback: (data: { event: IpcRendererEvent; args: any[] }) => void) => void;
  sendAsyncEventToMain: (channel: string, ...args: any[]) => Promise<any>;
};


interface IpcRendererEvent {

  // Docs: https://electronjs.org/docs/api/structures/ipc-renderer-event
  //
  // /**
  //  * A list of MessagePorts that were transferred with this message
  //  */
  // ports: MessagePort[];
  // /**
  //  * The `IpcRenderer` instance that emitted the event originally
  //  */
  // sender: any;
  // /**
  //  * The `webContents.id` that sent the message, you can call
  //  * `event.sender.sendTo(event.senderId, ...)` to reply to the message, see
  //  * ipcRenderer.sendTo for more information. This only applies to messages sent from
  //  * a different renderer. Messages sent directly from the main process set
  //  * `event.senderId` to `0`.
  //  */
  senderId: number;
}

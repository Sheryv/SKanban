/* SystemJS module definition */
import { Entity } from './client/model/entity';

declare var nodeModule: NodeModule;

interface NodeModule {
  id: string;
}

declare var window: Window;

interface Window {
  process: any;
  require: any;
}

type Row = { [key: string]: any } | Entity;


interface ClientProcess extends NodeJS.EventEmitter {
  
  // Docs: http://electronjs.org/docs/api/ipc-renderer
  
  /**
   * Resolves with the response from the main process.
   *
   * Send a message to the main process via `channel` and expect a result
   * asynchronously. Arguments will be serialized with the Structured Clone
   * Algorithm, just like `window.postMessage`, so prototype chains will not be
   * included. Sending Functions, Promises, Symbols, WeakMaps, or WeakSets will throw
   * an exception.
   *
   * > **NOTE**: Sending non-standard JavaScript types such as DOM objects or special
   * Electron objects is deprecated, and will begin throwing an exception starting
   * with Electron 9.
   *
   * The main process should listen for `channel` with `ipcMain.handle()`.
   *
   * For example:
   *
   * If you need to transfer a `MessagePort` to the main process, use
   * `IPC_RENDERER.postMessage`.
   *
   If you do not need a respons to the message, consider using `IPC_RENDERER.send`.
   */
  invoke(channel: string, ...args: any[]): Promise<any>;
  
  /**
   * Listens to `channel`, when a new message arrives `listener` would be called with
   * `listener(event, args...)`.
   */
  on(channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void): this;
  
  /**
   * Adds a one time `listener` function for the event. This `listener` is invoked
   * only the next time a message is sent to `channel`, after which it is removed.
   */
  once(channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void): this;
  
  /**
   * Send a message to the main process, optionally transferring ownership of zero or
   * more `MessagePort` objects.
   *
   * The transferred `MessagePort` objects will be available in the main process as
   * `MessagePortMain` objects by accessing the `ports` property of the emitted
   * event.
   *
   * For example:
   *
   * For more information on using `MessagePort` and `MessageChannel`, see the MDN
   * documentation.
   */
  postMessage(channel: string, message: any, transfer?: MessagePort[]): void;
  
  /**
   * Removes all listeners, or those of the specified `channel`.
   */
  removeAllListeners(channel: string): this;
  
  /**
   * Removes the specified `listener` from the listener array for the specified
   * `channel`.
   */
  removeListener(channel: string, listener: (...args: any[]) => void): this;
  
  /**
   * Send an asynchronous message to the main process via `channel`, along with
   * arguments. Arguments will be serialized with the Structured Clone Algorithm,
   * just like `window.postMessage`, so prototype chains will not be included.
   * Sending Functions, Promises, Symbols, WeakMaps, or WeakSets will throw an
   * exception.
   *
   * > **NOTE**: Sending non-standard JavaScript types such as DOM objects or special
   * Electron objects is deprecated, and will begin throwing an exception starting
   * with Electron 9.
   *
   * The main process handles it by listening for `channel` with the `ipcMain`
   * module.
   *
   * If you need to transfer a `MessagePort` to the main process, use
   * `IPC_RENDERER.postMessage`.
   *
   * If you want to receive a single response from the main process, like the result
   * of a method call, consider using `IPC_RENDERER.invoke`.
   */
  send(channel: string, ...args: any[]): void;
  
  /**
   * The value sent back by the `ipcMain` handler.
   *
   * Send a message to the main process via `channel` and expect a result
   * synchronously. Arguments will be serialized with the Structured Clone Algorithm,
   * just like `window.postMessage`, so prototype chains will not be included.
   * Sending Functions, Promises, Symbols, WeakMaps, or WeakSets will throw an
   * exception.
   *
   * > **NOTE**: Sending non-standard JavaScript types such as DOM objects or special
   * Electron objects is deprecated, and will begin throwing an exception starting
   * with Electron 9.
   *
   * The main process handles it by listening for `channel` with `ipcMain` module,
   * and replies by setting `event.returnValue`.
   *
   * > :warning: **WARNING**: Sending a synchronous message will block the whole
   * renderer process until the reply is received, so use this method only as a last
   * resort. It's much better to use the asynchronous version, `invoke()`.
   */
  sendSync(channel: string, ...args: any[]): any;
  
  /**
   * Sends a message to a window with `webContentsId` via `channel`.
   */
  sendTo(webContentsId: number, channel: string, ...args: any[]): void;
  
  /**
   * Like `IPC_RENDERER.send` but the event will be sent to the `<webview>` element in
   * the host page instead of the main process.
   */
  sendToHost(channel: string, ...args: any[]): void;
}

interface ClientEvent extends Event {
  
  // Docs: http://electronjs.org/docs/api/structures/ipc-renderer-event
  
  /**
   * A list of MessagePorts that were transferred with this message
   */
  ports: MessagePort[];
  /**
   * The `IpcRenderer` instance that emitted the event originally
   */
  sender: ClientProcess;
  /**
   * The `webContents.id` that sent the message, you can call
   * `event.sender.sendTo(event.senderId, ...)` to reply to the message, see
   * IPC_RENDERER.sendTo for more information. This only applies to messages sent from
   * a different renderer. Messages sent directly from the main process set
   * `event.senderId` to `0`.
   */
  senderId: number;
}


interface ServerEvent extends Event {
  
  // Docs: http://electronjs.org/docs/api/structures/ipc-main-event
  
  /**
   * The ID of the renderer frame that sent this message
   */
  frameId: number;
  /**
   * A list of MessagePorts that were transferred with this message
   */
  ports: any;
  /**
   * A function that will send an IPC message to the renderer frame that sent the
   * original message that you are currently handling.  You should use this method to
   * "reply" to the sent message in order to guarantee the reply will go to the
   * correct process and frame.
   */
  reply: Function;
  /**
   * Set this to the value to be returned in a synchronous message
   */
  returnValue: any;
  /**
   * Returns the `webContents` that sent the message
   */
  sender: any;
}

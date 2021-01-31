import { Observable, Subject } from 'rxjs';
import { app, remote, ipcRenderer, ipcMain } from 'electron';
import { Utils } from '../util/utils';

export class Bridge {
  
  // static readonly clientBus: Subject<{ event: ClientEvent, args: any[] }> = new Subject();
  // static readonly serverBus: Subject<{ event: ServerEvent, args: any[] }> = new Subject();
  private static readonly LISTENERS: { key: string, receiver: Subject<any[]> }[] = [];
  private static readonly PROCESSORS: { key: string, single?: boolean, processor: (args: any[]) => Observable<any[]> | any[] }[] = [];
  
  static initClient() {
    if (!this.isClient()) {
      throw Error('It is not client process. Cannot init');
    }
    
    ipcRenderer.on('asynchronous-reply', (event, arg) => {
      
      console.debug('>> client received', arg, this.LISTENERS);
      const id = arg[0] as string;
      const listener = this.LISTENERS.findIndex(l => l.key === id);
      if (listener < 0) {
        console.error('>> null receiver', id);
      } else {
        const params = (<any[]>arg).slice(1);
        const receiver = this.LISTENERS[listener].receiver;
        // console.debug('Exec: ', receiver, params);
        try {
          receiver.next(params);
        } catch (e) {
          console.error('>>> ', e);
        }
        this.LISTENERS.splice(listener, 1);
      }
    });
    
    ipcRenderer.on('asynchronous-error', (event, arg) => {
      console.error('>> server error', arg, event);
    });
  }
  
  static clientSend(id: string, ...args: any[]): Observable<any[]> {
    if (!this.isClient()) {
      throw Error('It is not client process. Cannot send');
    }
    const receiver = new Subject<any[]>();
    const fullId = id + '/' + Utils.generateId();
    this.LISTENERS.push({key: fullId, receiver: receiver});
    args = [fullId, ...args];
    console.debug('>> client send', fullId, args);
    
    ipcRenderer.send('asynchronous-message', args);
    return receiver;
  }
  
  
  static initServer() {
    const server = this.getServer();
    if (server == null) {
      throw Error('It is not server process. Cannot init');
    }
    
    ipcMain.on('asynchronous-message', (event, arg) => {
      const fullId = arg[0] as string;
      console.debug('>> server received:', fullId, '; ', arg, this.PROCESSORS.map(p => p.key).join(','));
      const id = fullId.split('/')[0];
      const i = this.PROCESSORS.findIndex(l => l.key === id);
      if (i < 0) {
        console.error('>> null processor', id);
        event.sender.send('asynchronous-error', [fullId, ' >> null processor << ', arg]);
      } else {
        try {
          const processor = this.PROCESSORS[i];
          const result = processor.processor((<any[]>arg).slice(1));
          if (processor.single) {
            this.PROCESSORS.splice(i, 1);
          }
          if (result instanceof Observable) {
            result.subscribe(r => {
              const args = Array.isArray(r) ? [fullId, ...r] : [fullId, r];
              event.sender.send('asynchronous-reply', args);
            }, error1 => {
              console.error('>>>> Error in server bridge <<<<<', error1);
              event.sender.send('asynchronous-error', [fullId, error1, arg]);
            });
          } else {
            event.sender.send('asynchronous-reply', [fullId, ...result]);
          }
        } catch (e) {
          event.sender.send('asynchronous-error', [fullId, e, arg]);
        }
      }
    });
    
  }
  
  static registerServerListener(id: string, process: (args: any[]) => Observable<any[]> | any[]) {
    if (this.getServer() == null) {
      throw Error('It is not server process. Cannot register');
    }
    console.debug('>> server register', id);
    
    this.PROCESSORS.push({key: id, processor: process});
  }
  
  
  static isClient(): boolean {
    return app == null || remote != null;
  }
  
  static getServer(): any {
    return app;
  }
  
}

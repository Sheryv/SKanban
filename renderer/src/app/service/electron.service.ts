import { Injectable, NgZone } from '@angular/core';

import { from, map, Observable, of, switchMap } from 'rxjs';
import { IpcConfig, Ipcs } from '../../shared/model/ipcs';
import { runInZone } from '../util/client-utils';
import { DbOperation } from '../../shared/model/db';
import { NODE_CTX } from '../global';
import { take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class ElectronService {

  constructor(private ngZone: NgZone) {

  }

  sendDb(request: DbOperation) {
    return this.send(Ipcs.DB, request);
  }

  send<I, O>(config: IpcConfig<I, O>, request: I, dontRunInZone: boolean = true): Observable<O> {
    let promise = NODE_CTX.sendAsyncEventToMain(config.channel, request);
    let observable = from(promise);
    return observable.pipe(
      switchMap(r => dontRunInZone ? of(r) : of(r).pipe(runInZone(this.ngZone))),
      map(r => r as O),
      take(1),
    );
  }

  showDbFile() {
    this.send(Ipcs.SHELL, {op: 'showItemInFolder', name: Ipcs.SHELL_SHOW_ITEM_IN_FOLDER.showDbFile});
  }

  streamEvents<I, O>(config: IpcConfig<I, O>): Observable<I> {
    return new Observable(subscriber => {
      NODE_CTX.eventStreamFromMain(config.channel, data => subscriber.next(data.args as I));
    })
      .pipe(runInZone(this.ngZone), map(s => s as I));
  }
}

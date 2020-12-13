import { Injectable } from '@angular/core';
import { ShortcutEventOutput, ShortcutInput } from 'ng-keyboard-shortcuts';
import { Subject } from 'rxjs';

export class KeyEvent {
  public readonly def: ShortcutInput;
  
  constructor(def: (emitter: Subject<ShortcutEventOutput>) => ShortcutInput, public readonly emitter: Subject<ShortcutEventOutput> = new Subject()) {
    this.def = def(emitter);
  }
}

@Injectable({
  providedIn: 'root',
})
export class KeyCommandsService {
  readonly addEvent: KeyEvent = new KeyEvent(e => {
    return {
      key: 'ctrl + shift + a',
      command(event: ShortcutEventOutput): any {
        console.debug('KEY: ', event.key);
        e.next(event);
      },
      description: 'Create task (target list have to be selected)',
    };
  });
  
  prepareShortcuts(): ShortcutInput[] {
    return [
      this.addEvent.def,
    ];
  }
  
}

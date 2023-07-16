/* eslint-disable no-bitwise */
import { Injectable } from '@angular/core';
import { AllowIn, KeyboardShortcutsHelpService, ShortcutEventOutput, ShortcutInput } from 'ng-keyboard-shortcuts';
import { Subject } from 'rxjs';
import { NODE_CTX } from '../global';
import { filter, takeUntil } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';


export class KeyEvent {
  public readonly def: ShortcutInput;

  constructor(def: (emitter: Subject<ShortcutEventOutput>) => ShortcutInput,
              public readonly emitter: Subject<ShortcutEventOutput> = new Subject()) {
    this.def = def(emitter);
  }

  onTrigger(callback: (event: ShortcutEventOutput) => void, onDestroySubject: Subject<any> = null) {
    if (onDestroySubject) {
      return this.emitter.pipe(takeUntil(onDestroySubject)).subscribe(s => {
        callback(s);
      });
    } else {
      return this.emitter.subscribe(s => {
        callback(s);
      });
    }
  }

  toShortString(): string {
    const binding = Array.isArray(this.def.key) ? this.def.key[0] : this.def.key;

    return binding.replace('ctrl + ', '^').replace('shift + ', '⇧').toUpperCase();
  }

  toLongStringAll(): string[] {
    const bindings = Array.isArray(this.def.key) ? this.def.key : [this.def.key];

    return bindings.map(b => {
        return b.split(' ').map(part => {
          if (part.length > 0) {
            return part[0].toUpperCase() + part.slice(1);
          } else {
            return part;
          }
        }).join(' ');
      },
    );
  }

  emit() {
    this.emitter.next({
      key: this.def.key,
      event: {} as KeyboardEvent,
    });
  }

}

@Injectable({
  providedIn: 'root',
})
export class KeyCommandsService {

  // private keys: ShortcutInput[] = [];

  constructor(private dialog: MatDialog, private keysService: KeyboardShortcutsHelpService) {
    // this.keysService.shortcuts$.subscribe(k => {
    //   console.log('add keys', k)
    //   this.keys = k.map(s => s as ShortcutInput)
    // });
  }

  listShortcuts(): ShortcutInput[] {
    return Object.values(ACTIONS).map(s => s.def);
  }

  dialogAwareEmitter(action: KeyEvent, onDestroySubject: Subject<any> = null) {
    const obs = onDestroySubject ? action.emitter.pipe(takeUntil(onDestroySubject)) : action.emitter;
    return obs.pipe(filter(s => this.dialog.openDialogs == null || this.dialog.openDialogs.length === 0));
  }

  // toMonacoKeyCode(action: KeyEvent): number {
  //   const e = this.keys.find(k => action.def.key === k.key)?.['event'];
  //   if (e) {
  //     let res = monaco.KeyCode[e.code];
  //     if (e.ctrlKey) {
  //       res = res | monaco.KeyMod.CtrlCmd;
  //     }
  //     if (e.altKey) {
  //       res = res | monaco.KeyMod.Alt;
  //     }
  //     if (e.shiftKey) {
  //       res = res | monaco.KeyMod.Shift;
  //     }
  //
  //     console.log('conteverted key ', action.def.key, res);
  //
  //     return res;
  //   }
  //   return 0;
  // }
}

export const ACTIONS = {
  addTask: defaultKeyEvent('ctrl + shift + a', 'Create task (target list have to be selected)'),
  editSelectedTask: defaultKeyEvent('ctrl + shift + e', 'Edit selected task', 'f2'),
  saveTask: defaultKeyEvent('ctrl + s', 'Save task', null, {
    allowIn: [AllowIn.Input, AllowIn.Textarea, AllowIn.ContentEditable],
    throttleTime: 500,
  }),
  markTaskAsDone: defaultKeyEvent('ctrl + shift + d', 'Mark selected task as \'Done\''),
  moveTaskToTop: defaultKeyEvent('ctrl + shift + t', 'Move selected task to top'),
  moveTaskToBottom: defaultKeyEvent('ctrl + shift + g', 'Move selected task to bottom'),
  searchInLists: defaultKeyEvent('ctrl + f', 'Quick task search in current board'),
  advancedSearchInLists: defaultKeyEvent('ctrl + shift + f', 'Advanced task search in current board'),
  escapeCommand: defaultKeyEvent('esc', 'Cancel action / Close task details panel', null, { allowIn: [AllowIn.Input, AllowIn.Textarea] }),
};

function defaultKeyEvent(
  key: string,
  description: string,
  additionalKey: string | null = null,
  options: Pick<ShortcutInput, 'allowIn' | 'label' | 'target' | 'throttleTime' | 'preventDefault'> = null,
): KeyEvent {
  const keys = additionalKey ? [key, additionalKey] : key;

  return new KeyEvent(e => ({
    key: keys,
    command(event: ShortcutEventOutput): any {
      if (NODE_CTX.isDevEnvironment) {
        console.debug('KEY: ', event.key, event);
      }
      e.next(event);
    },
    description,
    ...(options || {}),
  }));
}


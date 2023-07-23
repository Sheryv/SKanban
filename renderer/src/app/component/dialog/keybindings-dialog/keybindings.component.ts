import { Component } from '@angular/core';
import { ACTIONS, KeyEvent } from '../../../service/key-commands.service';

type Row = { key: string; value: any; children?: Row[] };


@Component({
  selector: 'app-keybindings',
  templateUrl: './keybindings.component.html',
  styleUrls: ['./keybindings.component.scss'],
})
export class KeybindingsComponent {


  readonly keybindings: KeyEvent[];

  constructor() {
    const k = Object.values(ACTIONS);
    k.push(this.dummyKeyBinding('ctrl + -', 'Zoom out'));
    k.push(this.dummyKeyBinding('ctrl + +', 'Zoom in'));
    k.push(this.dummyKeyBinding('ctrl + 0', 'Reset zoom'));
    this.keybindings = k;
  }

  private dummyKeyBinding(key: string, description: string) {
    return new KeyEvent(() => ({
      key,
      description,
      command(): any {
      },
    }));
  }
}

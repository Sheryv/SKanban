import { Component } from '@angular/core';
import { ShortcutInput } from 'ng-keyboard-shortcuts';
import { ACTIONS, KeyCommandsService, KeyEvent } from '../../../service/key-commands.service';

type Row = { key: string; value: any; children?: Row[] };


@Component({
  selector: 'app-keybindings',
  templateUrl: './keybindings.component.html',
  styleUrls: ['./keybindings.component.scss'],
})
export class KeybindingsComponent {


  keybindings: KeyEvent[] = Object.values(ACTIONS);
}

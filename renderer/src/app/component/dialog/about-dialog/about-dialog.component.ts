import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ElectronService } from '../../../service/electron.service';
import { NODE_CTX } from '../../../global';

@Component({
  selector: 'app-about-dialog',
  templateUrl: 'about-dialog.component.html',
})
export class AboutDialogComponent {
  version: string = NODE_CTX?.versions?.app;

  constructor(@Inject(MAT_DIALOG_DATA) public data: any, private electron: ElectronService) {
  }

  open(link: string) {
    NODE_CTX.openLink(link);
  }
}

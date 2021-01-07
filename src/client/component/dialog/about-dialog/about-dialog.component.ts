import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ElectronService } from '../../../service/electron.service';

@Component({
  selector: 'app-about-dialog',
  templateUrl: 'about-dialog.component.html',
})
export class AboutDialogComponent {
  
  constructor(@Inject(MAT_DIALOG_DATA) public data: any, private electron: ElectronService) {
  }
  
  open(link: string) {
    this.electron.openExternal(link);
  }
}

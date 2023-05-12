import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TaskWithBoard } from '../../../service/reminder.service';
import { State } from '../../../service/state';

@Component({
  selector: 'app-reminders-dialog',
  templateUrl: 'reminders-dialog.component.html',
})
export class RemindersDialogComponent {

  constructor(@Inject(MAT_DIALOG_DATA) public data: { tasks: TaskWithBoard[] }, private dialog: MatDialogRef<any>) {
  }

  close() {
    this.dialog.close();
  }
}

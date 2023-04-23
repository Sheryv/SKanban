import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Task } from '../../../../shared/model/entity/task';

@Component({
  selector: 'app-reminders-dialog',
  templateUrl: 'reminders-dialog.component.html',
})
export class RemindersDialogComponent {


  constructor(@Inject(MAT_DIALOG_DATA) public data: { tasks: Task[] }, private dialog: MatDialogRef<any>) {
  }

  close() {
    this.dialog.close();
  }
}

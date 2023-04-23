import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { DateTimeDialogComponent } from '../component/dialog/date-time-dialog/date-time-dialog.component';
import { AbstractControl } from '@angular/forms';
import { DateTime } from 'luxon';
import { Task } from '../../shared/model/entity/task';
import { RemindersDialogComponent } from '../component/dialog/reminders-dialog/reminders-dialog.component';

@Injectable({
  providedIn: 'root',
})
export class ViewService {

  constructor(private dialog: MatDialog) {
  }

  openDatepicker(form: AbstractControl<DateTime>, showSeconds: boolean = true) {
    this.dialog
      .open<DateTimeDialogComponent, { date: DateTime, showSeconds: boolean }>(DateTimeDialogComponent, {
        width: '700px',
        data: {date: form.value, showSeconds},
        // minHeight: '540px',
      })
      .afterClosed()
      .subscribe((date: DateTime) => {
        if (date) {
          if (date.toMillis() == 0) {
            form.setValue(null);
          } else {
            let d = date;
            if (!showSeconds) {
              d = date.set({second: 0});
            }
            form.setValue(d);
          }
        }
      });
  }


  showRemindersListDialog(tasks: Task[]){
    this.dialog
      .open<RemindersDialogComponent, { tasks: Task[] }>(RemindersDialogComponent, {
        width: '700px',
        disableClose: true,
        data: {tasks},
        height: '600px',
      })
      .afterClosed()
      .subscribe((date: DateTime) => {

      });
  }

}

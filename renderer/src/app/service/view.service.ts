import { Injectable, TemplateRef } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { DateTimeDialogComponent } from '../component/dialog/date-time-dialog/date-time-dialog.component';
import { AbstractControl } from '@angular/forms';
import { DateTime } from 'luxon';
import { Task } from '../../shared/model/entity/task';
import { RemindersDialogComponent } from '../component/dialog/reminders-dialog/reminders-dialog.component';
import {
  AbstractDialogComponent,
  DialogCreateParams,
  DialogTemplateParams,
} from '../component/dialog/abstract-dialog/abstract-dialog.component';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ViewService {

  private remindersDialogHandle: MatDialogRef<RemindersDialogComponent> = null;

  constructor(private dialog: MatDialog) {
  }

  openDatepicker(form: AbstractControl<DateTime>, showSeconds: boolean = true, showHolidays: boolean = false) {
    this.dialog
      .open<DateTimeDialogComponent, { date: DateTime; showSeconds: boolean; showHolidays: boolean }>(DateTimeDialogComponent, {
        width: '700px',
        data: {date: form.value, showSeconds, showHolidays},
        // minHeight: '540px',
      })
      .afterClosed()
      .subscribe((date: DateTime) => {
        if (date) {
          if (date.toMillis() === 0) {
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


  showRemindersListDialog(tasks: Task[]) {
    this.remindersDialogHandle?.close();

    this.remindersDialogHandle = this.dialog.open<RemindersDialogComponent, { tasks: Task[] }>(RemindersDialogComponent, {
      width: '700px',
      disableClose: true,
      data: {tasks},
      height: '600px',
    });
    this.remindersDialogHandle.afterClosed().subscribe((date: DateTime) => {

    });
  }


  openAbstractDialog(template: TemplateRef<DialogTemplateParams>, args: DialogCreateParams): Observable<any> {
    return this.dialog
      .open<AbstractDialogComponent, DialogCreateParams>(AbstractDialogComponent, {
        width: '700px',
        disableClose: true,
        data: args,
        // height: '600px',
      })
      .afterClosed();
  }
}

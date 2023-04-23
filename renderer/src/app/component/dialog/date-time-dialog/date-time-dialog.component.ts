import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DateTime } from 'luxon';
import { MatCalendarCellClassFunction } from '@angular/material/datepicker';

@Component({
  selector: 'app-date-time-dialog',
  templateUrl: 'date-time-dialog.component.html',
})
export class DateTimeDialogComponent {
  time = new Date();
  date: DateTime;

  meridian: boolean = false;

  predefined: { hour: number, minute: number, date: string }[];

  dateClass: MatCalendarCellClassFunction<DateTime> = (cellDate, view) => {
    // Only highligh dates inside the month view.
    if (view === 'month') {
      const date = cellDate.day;

      // Highlight the 1st and 20th day of each month.
      return date === 1 || date === 20 ? 'calendar-highlight-day' : '';
    }

    return '';
  };

  dateFilter = (d: DateTime | null): boolean => {
    const day = (d || DateTime.now()).weekday;
    // Prevent Saturday and Sunday from being selected.
    return day !== 7 && day !== 6;
  };

  constructor(public dialogRef: MatDialogRef<DateTimeDialogComponent>, @Inject(MAT_DIALOG_DATA) public data: { date: DateTime, showSeconds: boolean }) {
    this.date = data && data.date || DateTime.now();
    const s = DateTime.parseFormatForOpts(DateTime.TIME_SIMPLE);
    console.log(s, s.includes('a'));
    this.meridian = s.includes('a');
    this.time = this.date.toJSDate();
    this.predefined = [...Array(15).keys()].flatMap(k => [
      {
        hour: k + 7,
        minute: 0,
        date: DateTime.fromObject({hour: k + 7, minute: 0}).toLocaleString(DateTime.TIME_SIMPLE),
      },
      {
        hour: k + 7,
        minute: 30,
        date: DateTime.fromObject({hour: k + 7, minute: 30}).toLocaleString(DateTime.TIME_SIMPLE),
      },
    ]);
  }

  onChangeTime(time: Date) {
    this.date = this.date.set({hour: time.getHours(), minute: time.getMinutes(), second: time.getSeconds()});
  }

  onChangeTimeSpecific(hour: number, minute: number) {
    this.date = this.date.set({hour: hour, minute: minute, second: 0});
    this.time = new Date(this.time.setHours(hour, minute));
  }

  onChangeDay(day: DateTime) {
    this.date = day.set({hour: this.time.getHours(), minute: this.time.getMinutes(), second: this.time.getSeconds()});
  }

  save() {
    this.dialogRef.close(this.date);
  }

  clear() {
    this.dialogRef.close(DateTime.fromMillis(0));
  }
}

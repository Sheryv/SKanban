import { Component, Inject, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DateTime } from 'luxon';
import { SettingsService } from '../../../service/settings.service';
import { MatCalendar } from '@angular/material/datepicker';

@Component({
  selector: 'app-date-time-dialog',
  templateUrl: 'date-time-dialog.component.html',
})
export class DateTimeDialogComponent {
  time = new Date();
  date: DateTime;

  meridian = false;

  predefined: { hour: number; minute: number; date: string }[];

  @ViewChild(MatCalendar, { static: false }) calendar: MatCalendar<DateTime>;

  private holidays: DateTime[];

  constructor(public dialogRef: MatDialogRef<DateTimeDialogComponent>,
              private settings: SettingsService,
              @Inject(MAT_DIALOG_DATA) public data: { date: DateTime; showSeconds: boolean; showHolidays: boolean }) {
    this.date = data && data.date || DateTime.now();

    this.holidays = settings.settingsDef.ui.notifications.customHolidays.getValue()?.map(r => DateTime.fromISO(r.get('date'))) ?? [];
    this.meridian = DateTime.parseFormatForOpts(DateTime.TIME_SIMPLE).includes('a');
    this.time = this.date.toJSDate();
    this.predefined = [...Array(15).keys()].flatMap(k => [
      {
        hour: k + 7,
        minute: 0,
        date: DateTime.fromObject({ hour: k + 7, minute: 0 }).toLocaleString(DateTime.TIME_SIMPLE),
      },
      {
        hour: k + 7,
        minute: 30,
        date: DateTime.fromObject({ hour: k + 7, minute: 30 }).toLocaleString(DateTime.TIME_SIMPLE),
      },
    ]);
  }

  calendarDayClassProvider = (cellDate: DateTime, view) => {
    if (this.data && this.data.showHolidays && view === 'month') {
      if (this.holidays.some(d => d.day === cellDate.day && d.month === cellDate.month && d.year === cellDate.year)) {
        return 'calendar-highlight-day';
      }

      if (this.settings.settingsDef.ui.notifications.saturdaysAreHolidays && cellDate.weekday === 6
        || this.settings.settingsDef.ui.notifications.sundaysAreHolidays && cellDate.weekday === 7) {
        return 'calendar-highlight-day-weekend';
      }
    }

    return '';
  };

  onChangeTime(time: Date) {
    this.date = this.date.set({ hour: time.getHours(), minute: time.getMinutes(), second: time.getSeconds() });
  }

  onChangeTimeSpecific(hour: number, minute: number) {
    this.date = this.date.set({ hour, minute, second: 0 });
    this.time = new Date(this.time.setHours(hour, minute));
  }

  onChangeDay(day: DateTime = DateTime.now()) {
    this.date = day.set({ hour: this.time.getHours(), minute: this.time.getMinutes(), second: this.time.getSeconds() });
  }

  save() {
    this.dialogRef.close(this.date);
  }

  clear() {
    this.dialogRef.close(DateTime.fromMillis(0));
  }

  setToNow() {
    const now = DateTime.now();
    this.date = now;
    this.time = now.toJSDate();
    this.calendar.activeDate = now;
    this.calendar.updateTodaysDate();
  }
}

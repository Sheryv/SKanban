import { ReminderService } from './reminder.service';
import { TestBed } from '@angular/core/testing';
import { AppModule } from '../app.module';
import { Settings, SettingsService } from './settings.service';
import { DateTime } from 'luxon';


function e<T>(t: T): jasmine.Matchers<T> {
  return expect(t);
}

function check(expected: DateTime, snooze: number) {
  const res = service.calculateNextSnoozeDate(snooze, notifications);
  e(res.startOf('minute')).toEqual(expected.startOf('minute'));
}

let service: ReminderService;
let notifications: Settings['ui']['notifications'];

describe('ReminderService correctly calculate snoozed date', () => {
    const singleDay = 60 * 24;

    beforeEach(() => {
      TestBed.configureTestingModule({
        imports: [AppModule],
      });
      service = TestBed.inject(ReminderService);
      const settings = TestBed.inject(SettingsService);
      notifications = settings.settingsDef.ui.notifications;
      notifications.sundaysAreHolidays.replaceValue(true);
      notifications.saturdaysAreHolidays.replaceValue(true);
      jasmine.clock().install();
    });
    afterEach(() => {
      jasmine.clock().uninstall();
    });

    it('next days of Thursday', () => {
      const date = DateTime.fromObject({ year: 2023, month: 5, day: 4, hour: 10 });
      jasmine.clock().mockDate(date.toJSDate());

      check(date.set({ day: 5 }), singleDay);
      check(date.set({ day: 8 }), singleDay * 2);
      check(date.set({ day: 11 }), singleDay * 5);
      check(date.set({ day: 15 }), singleDay * 7);
    });

    it('next days of Friday', () => {
      const date = DateTime.fromObject({ year: 2023, month: 5, day: 5, hour: 10 });
      jasmine.clock().mockDate(date.toJSDate());

      check(date.set({ day: 8 }), singleDay);
      check(date.set({ day: 9 }), singleDay * 2);
      check(date.set({ day: 10 }), singleDay * 3);

      notifications.saturdaysAreHolidays.replaceValue(false);

      check(date.set({ day: 6 }), singleDay);
      check(date.set({ day: 8 }), singleDay * 2);
      check(date.set({ day: 9 }), singleDay * 3);

      notifications.sundaysAreHolidays.replaceValue(false);

      check(date.set({ day: 6 }), singleDay);
      check(date.set({ day: 7 }), singleDay * 2);
      check(date.set({ day: 8 }), singleDay * 3);
    });

    it('next day of Saturday', () => {
      const date = DateTime.fromObject({ year: 2023, month: 5, day: 6, hour: 10 });
      jasmine.clock().mockDate(date.toJSDate());

      check(date.set({ day: 8 }), singleDay);
    });

    it('next day of Sunday', () => {
      const date = DateTime.fromObject({ year: 2023, month: 5, day: 7, hour: 10 });
      jasmine.clock().mockDate(date.toJSDate());

      check(date.set({ day: 8 }), singleDay);
    });

    it('within single day', () => {
      const date = DateTime.fromObject({ year: 2023, month: 5, day: 6, hour: 10, minute: 1 });
      jasmine.clock().mockDate(date.toJSDate());

      check(date.set({ hour: 11 }), 60);
      check(date.set({ day: 8, hour: 0 }), 60 * 14);
    });

    it('with custom holiday after weekend', () => {
      const date = DateTime.fromObject({ year: 2023, month: 5, day: 6, hour: 10, minute: 1 });
      jasmine.clock().mockDate(date.toJSDate());

      const m: ReturnType<typeof notifications.customHolidays.getValue>[0] = new Map();
      m.set('name', 'Test');
      m.set('date', date.set({ day: 8 }));
      notifications.customHolidays.replaceValue([m]);

      check(date.set({ hour: 11 }), 60);
      check(date.set({ day: 9, hour: 0 }), 60 * 14);

      check(date.set({ day: 9 }), singleDay);
    });

    it('with custom holiday before weekend', () => {
      let date = DateTime.fromObject({ year: 2023, month: 5, day: 5, hour: 10, minute: 1 });
      jasmine.clock().mockDate(date.toJSDate());

      // same day as  holiday
      const m: ReturnType<typeof notifications.customHolidays.getValue>[0] = new Map();
      m.set('name', 'Test');
      m.set('date', date.set({ day: 5 }));
      notifications.customHolidays.replaceValue([m]);

      check(date.set({ hour: 11 }), 60);
      check(date.set({ day: 8, hour: 0 }), 60 * 14);

      check(date.set({ day: 8 }), singleDay);

      // a day before holiday
      date = DateTime.fromObject({ year: 2023, month: 5, day: 4, hour: 10, minute: 1 });
      jasmine.clock().mockDate(date.toJSDate());

      check(date.set({ hour: 11 }), 60);
      check(date.set({ day: 8, hour: 0 }), 60 * 14);

      check(date.set({ day: 8 }), singleDay);

      // a day before holiday with additional holiday after weekend
      const m2: ReturnType<typeof notifications.customHolidays.getValue>[0] = new Map();
      m2.set('name', 'Test');
      m2.set('date', date.set({ day: 8 }));
      notifications.customHolidays.replaceValue([m, m2]);

      check(date.set({ day: 9, hour: 0 }), 60 * 14);
      check(date.set({ day: 9 }), singleDay);
    });

  },
);

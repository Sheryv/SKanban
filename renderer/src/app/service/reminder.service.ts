import { Injectable } from '@angular/core';
import { Task } from '../../shared/model/entity/task';
import { State } from './state';
import { Ipcs } from '../../shared/model/ipcs';
import { ElectronService } from './electron.service';
import { debounceTime } from 'rxjs';
import { TaskService } from './task.service';
import { DateTime } from 'luxon';
import { Settings, SettingsService } from './settings.service';
import { ViewService } from './view.service';
import { TaskPriority } from '../../shared/model/entity/task-priority';
import { Board } from '../../shared/model/entity/board';
import { TaskList } from '../../shared/model/entity/task-list';

interface Reminder {
  task: Task;
  handlerId: number;
}


@Injectable({
  providedIn: 'root',
})
export class ReminderService {

  private reminders: Reminder[] = [];
  private settings: Settings['ui']['notifications'];

  private nextHandlerId: number;
  private nextHandlerDate: DateTime;

  constructor(private state: State,
              private electron: ElectronService,
              private settingsService: SettingsService,
              private viewService: ViewService,
              private taskService: TaskService) {

    this.electron.streamEvents(Ipcs.EVENT).pipe(debounceTime(200)).subscribe(event => {
      if (event.op === 'refreshBoard') {
        this.calculateReminders();
      }
    });
    this.settings = this.settingsService.settingsDef.ui.notifications;

    this.state.taskChangeEvent.subscribe(task => {
      if (task.due_date && task.due_date > DateTime.now().toMillis()) {
        if (this.nextHandlerDate == null || task.due_date < this.nextHandlerDate.toMillis()) {
          this.calculateReminders();
        }
      }
    });
  }


  calculateReminders() {
    this.taskService.getAllTasks().subscribe(lists => {
        this.calculateReminderForTasks(lists.flatMap(({ board, list, tasks }) => tasks.map(task => ({
          board,
          list,
          task,
        }))));
      },
    );
  }

  calculateReminderForTasks(tasks: TaskWithBoard[]) {
    this.addReminders(tasks);
  }

  addReminders(tasks: TaskWithBoard[]) {
    // upcoming
    const found = this.findTasksWithNotifications(tasks);
    console.debug('Calculated reminders of tasks', found);
    const { inNotificationTimeRange, overdue } = found;


    let min: TaskWithBoard;
    if (overdue.length > 0 || inNotificationTimeRange.length > 0) {

      let body = 'You have ';
      let title = 'Tasks reminder:';

      if (overdue.length > 0) {
        body += overdue.length + ' overdue';
        title = 'Overdue tasks reminder:';
      }

      if (inNotificationTimeRange.length > 0) {
        if (overdue.length > 0) {
          body += ' and ';
        }
        body += inNotificationTimeRange.length + ' upcoming';

      }
      body += ' tasks';

      if (this.settings.enableDesktopNotification.getValue()) {
        this.electron.send(Ipcs.SHELL, {
          op: 'showNotification',
          options: {
            title,
            body,
            urgency: 'normal',
          },
        });
      }

      this.showDialog([...overdue, ...inNotificationTimeRange]);
      min = inNotificationTimeRange.length > 0
        && inNotificationTimeRange.reduce((p, v) => (p.task.due_date < v.task.due_date ? p : v)) || null;
    }

    if (this.nextHandlerDate == null || min == null || this.nextHandlerDate.toMillis() <= min.task.due_date) {
      if (this.nextHandlerId) {
        clearTimeout(this.nextHandlerId);
      }

      this.nextHandlerDate = min ? DateTime.fromMillis(min.task.due_date) : DateTime.now().plus({ minute: 1 });
      const wait = this.nextHandlerDate.diffNow('milliseconds').milliseconds;
      console.debug('Scheduling next check to ', this.nextHandlerDate.toISO(), ' what is', wait, 'ms from now');
      this.nextHandlerId = Number(setTimeout(this.calculateReminders.bind(this), wait));
    }
    // for (const task of other) {
    //   const old = this.reminders.find(r => r.task.id === task.id);
    //   if (old == null || old.task.due_date !== task.due_date) {
    //     if (old) {
    //       this.reminders.splice(this.reminders.indexOf(old), 1);
    //       clearTimeout(old.handlerId);
    //     }
    //     const minutes = DateTime.fromMillis(task.due_date).diffNow('milliseconds');
    //
    //     const calc = minutes.minus({minute: 5});
    //     console.log(`Scheduled noti for '${task.title}' in ${Math.round(calc.as('minutes'))}
    //     minutes at ${DateTime.now().plus(calc).toISO()}`);
    //
    //     const handlerId = Number(setTimeout(this.scheduleHandler.bind(this), calc.toMillis(), task));
    //
    //     this.reminders.push({
    //       task, handlerId,
    //     });
    //   }
    // }
  }

  findTasksWithNotifications(tasks: TaskWithBoard[]):
    { overdue: TaskWithBoard[]; inNotificationTimeRange: TaskWithBoard[]; future: TaskWithBoard[] } {
    const overdue: TaskWithBoard[] = [];
    const inNotificationTimeRange: TaskWithBoard[] = [];
    const future: TaskWithBoard[] = [];

    tasks
      .filter(w => w.task.due_date != null && (w.task.handled == null || w.task.handled === 0))
      .map(w => ({ t: w, d: DateTime.fromMillis(w.task.due_date).diffNow('milliseconds') }))
      .forEach(({ t, d }) => {
        if (d.milliseconds >= this.settings.reminderAheadShowTime.getValue() * 60 * 1000) {
          future.push(t);
        } else if (d.milliseconds >= 0) {
          inNotificationTimeRange.push(t);
        } else {
          overdue.push(t);
        }
      });

    return { overdue, inNotificationTimeRange, future };
  }

  completeAll(tasks: TaskWithBoard[]) {
    const now = DateTime.now().toMillis();
    for (const task of tasks) {
      task.task.handled = now;
      this.taskService.saveTask(task.task);
    }
  }

  snoozeAll(tasks: TaskWithBoard[], minutes: number) {
    const newDate = this.calculateNextSnoozeDate(minutes, this.settings);

    for (const task of tasks) {
      task.task.due_date = newDate.toMillis();
      this.taskService.saveTask(task.task);
    }
  }

  calculateNextSnoozeDate(offsetMinutes: number, settings: Settings['ui']['notifications']): DateTime {
    const holidays: DateTime[] = settings.customHolidays.getValue().map(r => DateTime.fromISO(r.get('date'))).map(h => h.startOf('day'));
    const now = DateTime.now();
    let newDate = now.plus({ minute: offsetMinutes });
    if (!newDate.hasSame(now, 'day')) {
      let d = now.plus({ day: 1 });
      const found = new Set<number>();
      while (d.year < newDate.year
        || (d.year === newDate.year && (d.month < newDate.month
          || (d.month === newDate.month && d.day <= newDate.day)))
        ) {

        if (settings.saturdaysAreHolidays.getValue() && d.weekday === 6) {
          newDate = newDate.plus({ day: 1 });
        } else if (settings.sundaysAreHolidays.getValue() && d.weekday === 7) {
          newDate = newDate.plus({ day: 1 });
        }
        const f = holidays.filter(h => h.toMillis() <= newDate.toMillis() && h.toMillis() >= d.startOf('day').toMillis());
        for (const dateTime of f) {
          const millis = dateTime.toMillis();
          if (!found.has(millis)) {
            found.add(millis);
            newDate = newDate.plus({ day: 1 });
          }
        }

        d = d.plus({ day: 1 });
      }
    }

    return newDate;
  }

  private showDialog(tasks: TaskWithBoard[]) {
    this.viewService.showRemindersListDialog(tasks);
    if (this.settings.enableBringWindowToTop.getValue() && tasks.some(t => t.task.priority >= TaskPriority.CRITICAL)) {
      this.electron.send(Ipcs.SHELL, { op: 'bringWindowToTop' }).subscribe(() => this.electron.send(Ipcs.SHELL, { op: 'flashFrame' }));
    } else {
      this.electron.send(Ipcs.SHELL, { op: 'flashFrame' });
    }
  }
}

export type TaskWithBoard = { board: Board; list: TaskList; task: Task };

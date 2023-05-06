import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Task } from '../../shared/model/entity/task';
import { State } from './state';
import { Ipcs } from '../../shared/model/ipcs';
import { ElectronService } from './electron.service';
import { debounceTime, forkJoin, mergeMap } from 'rxjs';
import { TaskService } from './task.service';
import { DatabaseService } from './database.service';
import { take } from 'rxjs/operators';
import { DateTime } from 'luxon';
import { Settings, SettingsService } from './settings.service';
import { ViewService } from './view.service';
import { ClientUtils } from '../util/client-utils';
import { TaskPriority } from '../../shared/model/entity/task-priority';

interface Reminder {
  task: Task,
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

  constructor(private dialog: MatDialog,
              private state: State,
              private electron: ElectronService,
              private db: DatabaseService,
              private settingsService: SettingsService,
              private viewService: ViewService,
              private taskService: TaskService) {

    this.electron.streamEvents(Ipcs.EVENT).pipe(debounceTime(200)).subscribe(event => {
      if (event.op === 'refreshBoard') {
        this.calculateReminders();
      }
    });
    this.settings = this.settingsService.settingsDef.ui.notifications;

    this.state.taskChanged.subscribe(task => {
      if (task.due_date && task.due_date > DateTime.now().toMillis()) {
        if (this.nextHandlerDate == null || task.due_date < this.nextHandlerDate.toMillis()) {
          this.calculateReminders();
        }
      }
    });
  }


  calculateReminders() {

    (
      // boardId ? this.db.find({
      //   table: 'boards',
      //   findId: boardId,
      // }).pipe(map(r => [r] as Board[])) :
      this.taskService.getBoards()
    )
      .pipe(
        take(1),
        mergeMap(boards => forkJoin(boards.filter(b => b && b.id).flatMap(b => this.taskService.getLists(b)))),
      )
      .subscribe(lists => {
          this.calculateReminderForTasks(lists.flatMap(l => l).flatMap(l => l.$tasks));
        },
      );
  }

  calculateReminderForTasks(tasks: Task[]) {
    this.addReminders(tasks);
  }

  addReminders(tasks: Task[]) {
    // upcoming
    const found = this.findTasksWithNotifications(tasks);
    console.log('Calculated reminders of tasks', found);
    const {future, inNotificationTimeRange, overdue} = found;


    let min: Task;
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
      min = inNotificationTimeRange.length > 0 && inNotificationTimeRange.reduce((p, v) => (p.due_date < v.due_date ? p : v)) || null;
    }

    if (this.nextHandlerDate == null || min == null || this.nextHandlerDate.toMillis() <= min.due_date) {
      if (this.nextHandlerId) {
        clearTimeout(this.nextHandlerId);
      }

      this.nextHandlerDate = min ? DateTime.fromMillis(min.due_date) : DateTime.now().plus({minute: 1});
      const wait = this.nextHandlerDate.diffNow('milliseconds').milliseconds;
      console.log('Scheduling next check to ', this.nextHandlerDate.toISO(), ' what is', wait, 'ms from now');
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
    //     console.log(`Scheduled noti for '${task.title}' in ${Math.round(calc.as('minutes'))} minutes at ${DateTime.now().plus(calc).toISO()}`);
    //
    //     const handlerId = Number(setTimeout(this.scheduleHandler.bind(this), calc.toMillis(), task));
    //
    //     this.reminders.push({
    //       task, handlerId,
    //     });
    //   }
    // }
  }

  findTasksWithNotifications(tasks: Task[]): { overdue: Task[]; inNotificationTimeRange: Task[]; future: Task[] } {
    const overdue: Task[] = [];
    const inNotificationTimeRange: Task[] = [];
    const future: Task[] = [];

    tasks
      .filter(task => task.due_date != null && (task.handled == null || task.handled === 0))
      .map(t => ({t, d: DateTime.fromMillis(t.due_date).diffNow('milliseconds')}))
      .forEach(({t, d}) => {
        if (d.milliseconds >= this.settings.reminderAheadShowTime.getValue() * 60 * 1000) {
          future.push(t);
        } else if (d.milliseconds >= 0) {
          inNotificationTimeRange.push(t);
        } else {
          overdue.push(t);
        }
      });

    return {overdue, inNotificationTimeRange, future};
  }

  completeAll(tasks: Task[]) {
    const now = DateTime.now().toMillis();
    for (const task of tasks) {
      task.handled = now;
      this.taskService.saveTask(task);
    }
  }

  snoozeAll(tasks: Task[], minutes: number) {
    const holidays: DateTime[] = this.settings.customHolidays.getValue().map(r => DateTime.fromISO(r.get('date')));
    const now = DateTime.now();
    let newDate = now.plus({minute: minutes});
    if (!newDate.hasSame(now, 'day')) {
      const found = holidays.filter(h => h.toMillis() <= newDate.toMillis() && h.toMillis() >= now.toMillis());
      let d = now.plus({day: 1});
      while (d.year < newDate.year
        || (d.year === newDate.year && (d.month < newDate.month
          || (d.month === newDate.month && d.day <= newDate.day)))
        ) {

        if (this.settings.saturdaysAreHolidays.getValue() && d.weekday === 6) {
          found.push(d);
        } else if (this.settings.sundaysAreHolidays.getValue() && d.weekday === 7) {
          found.push(d);
        }
        d = d.plus({day: 1});
      }

      if (found.length > 0) {
        console.log('Holidays in range', found.map(h=>h.toISO()));
        newDate = newDate.plus({day: found.length});
      }
    }

    for (const task of tasks) {
      task.due_date = newDate.toMillis();
      this.taskService.saveTask(task);
    }
  }

  private showDialog(tasks: Task[]) {
    this.viewService.showRemindersListDialog(tasks);
    if (this.settings.enableBringWindowToTop.getValue() && tasks.some(t => t.priority >= TaskPriority.CRITICAL)) {
      this.electron.send(Ipcs.SHELL, {op: 'bringWindowToTop'}).subscribe(() => this.electron.send(Ipcs.SHELL, {op: 'flashFrame'}));
    } else {
      this.electron.send(Ipcs.SHELL, {op: 'flashFrame'});
    }
  }

  private scheduleHandler(task: Task) {
    const reminder = this.reminders.findIndex(r => r.task.id === task.id);
    this.reminders.splice(reminder, 1);
    clearTimeout(this.reminders[reminder].handlerId);

    const date = DateTime.fromMillis(task.due_date);
    const line = ClientUtils.formatOverdueDuration(date);
    this.electron.send(Ipcs.SHELL, {
      op: 'showNotification',
      options: {
        title: 'Task reminder:',
        body: `${task.title}\n${line}`,
        urgency: 'normal',
      },
    });
    this.showDialog([task]);
  }
}

import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Task } from '../../shared/model/entity/task';
import { State } from './state';
import { Ipcs } from '../../shared/model/ipcs';
import { ElectronService } from './electron.service';
import { debounceTime, forkJoin, mergeMap } from 'rxjs';
import { TaskService } from './task.service';
import { DatabaseService } from './database.service';
import { map } from 'rxjs/operators';
import { DateTime } from 'luxon';
import { SettingsService } from './settings.service';
import { ViewService } from './view.service';
import { ClientUtils } from '../util/client-utils';
import { Board } from '../../shared/model/entity/board';

interface Reminder {
  task: Task,
  handlerId: number;
}


@Injectable({
  providedIn: 'root',
})
export class ReminderService {

  private reminders: Reminder[] = [];

  constructor(private dialog: MatDialog,
              private state: State,
              private electron: ElectronService,
              private db: DatabaseService,
              private settings: SettingsService,
              private viewService: ViewService,
              private taskService: TaskService) {

    this.electron.streamEvents(Ipcs.EVENT).pipe(debounceTime(200)).subscribe(event => {
      if (event.op === 'refreshBoard') {
        this.calculateReminders(event.boardId);
      }
    });

    this.state.taskChanged.subscribe(task => this.calculateReminderForTasks([task]));
  }


  calculateReminders(boardId: number | null = null) {

    (
      boardId ? this.db.find({
        table: 'boards',
        findId: boardId,
      }).pipe(map(r => [r] as Board[])) : this.taskService.getBoards()
    )
      .pipe(
        mergeMap(boards => {
          return forkJoin(boards.filter(b => b && b.id).flatMap(b => {
            return this.taskService.getLists(b);
          }));
        }),
      )
      .subscribe(lists => {
          this.calculateReminderForTasks(lists.flatMap(l => l).flatMap(l => l.$tasks));
        },
      );
  }

  calculateReminderForTasks(tasks: Task[]) {
    this.addReminders(tasks.filter(task => task.due_date != null && task.handled == null));
  }

  addReminders(tasks: Task[]) {
    const overdue: Task[] = [];
    const other: Task[] = [];

    tasks.map(t => ({t, d: DateTime.fromMillis(t.due_date).diffNow('milliseconds')})).forEach(({t, d}) => {
      if (d.milliseconds >= 0) {
        other.push(t);
      } else {
        overdue.push(t);
      }
    });
    if (overdue.length > 0) {
      this.showDialog(overdue);
      let body: string;
      if (overdue.length > 1) {
        body = `You have ${overdue.length} overdue tasks`;
      } else {
        const task = overdue[0];
        body = task.title + '\n' + ClientUtils.formatDateForNextDay(DateTime.fromMillis(task.due_date));
      }

      this.electron.send(Ipcs.SHELL, {
        op: 'showNotification',
        options: {
          title: 'Overdue tasks reminder:',
          body: body,
          urgency: 'normal',
        },
      });
    }


    for (let task of other) {
      const old = this.reminders.find(r => r.task.id == task.id);
      if (old == null || old.task.due_date != task.due_date) {
        if (old) {
          this.reminders.splice(this.reminders.indexOf(old), 1);
          clearTimeout(old.handlerId);
        }
        const minutes = DateTime.fromMillis(task.due_date).diffNow('milliseconds');

        const calc = minutes.minus({minute: 5});
        console.log(`Scheduled noti for '${task.title}' in ${Math.round(calc.as('minutes'))} minutes at ${DateTime.now().plus(calc).toISO()}`);

        const handlerId = Number(setTimeout(this.scheduleHandler.bind(this), calc.toMillis(), task));

        this.reminders.push({
          task, handlerId,
        });
      }
    }
  }

  showDialog(tasks: Task[]) {
    this.viewService.showRemindersListDialog(tasks);
    this.electron.send(Ipcs.SHELL, {op: 'flashFrame'});
  }


  private scheduleHandler(task: Task) {
    const date = DateTime.fromMillis(task.due_date);
    const line = ClientUtils.formatDateForNextDay(date);
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

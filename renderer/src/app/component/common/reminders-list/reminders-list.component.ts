import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Task } from '../../../../shared/model/entity/task';
import { DateTime } from 'luxon';
import { ClientUtils } from '../../../util/client-utils';
import { ReminderService } from '../../../service/reminder.service';

@Component({
  selector: 'app-reminders-list',
  templateUrl: './reminders-list.component.html',
})
export class RemindersListComponent implements OnInit {


  @Output()
  closed = new EventEmitter<any>();

  rows: { task: Task; inPast: boolean; dateLine: string }[];

  private now = DateTime.now().toMillis();

  // private changes: { task: Task, complete?: boolean, snooze?: number }[] = [];

  @Input()
  set tasks(tasks: Task[]) {
    this.rows = tasks.map(task => ({
      task,
      inPast: task.due_date < this.now,
      dateLine: ClientUtils.formatOverdueDuration(DateTime.fromMillis(task.due_date)),
    })).sort((a, b) => a.task.due_date - b.task.due_date);
  }

  constructor(private remindersService: ReminderService) {

  }

  ngOnInit(): void {
  }

  complete(task: Task) {
    this.rows.splice(this.rows.findIndex(r => r.task.id === task.id), 1);
    this.remindersService.completeAll([task]);
    if (this.rows.length === 0) {
      this.closed.emit();
    }
  }

  snooze(task: Task, minutes: number) {
    this.rows.splice(this.rows.findIndex(r => r.task.id === task.id), 1);
    this.remindersService.snoozeAll([task], minutes);
    if (this.rows.length === 0) {
      this.closed.emit();
    }
  }

  snoozeAll(minutes: number) {
    const tasks = this.rows.map(r => r.task).slice();
    this.remindersService.snoozeAll(tasks, minutes);
    for (const t of tasks) {
      this.snooze(t, minutes);
    }
  }

  completeAll() {
    const tasks = this.rows.map(r => r.task).slice();
    this.remindersService.completeAll(tasks);
    for (const t of tasks) {
      this.complete(t);
    }
  }
}

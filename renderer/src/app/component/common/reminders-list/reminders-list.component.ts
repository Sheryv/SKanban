import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { DateTime } from 'luxon';
import { ClientUtils } from '../../../util/client-utils';
import { ReminderService, TaskWithBoard } from '../../../service/reminder.service';
import { State } from '../../../service/state';

@Component({
  selector: 'app-reminders-list',
  templateUrl: './reminders-list.component.html',
})
export class RemindersListComponent implements OnInit {


  @Output()
  closed = new EventEmitter<any>();

  rows: { task: TaskWithBoard; inPast: boolean; dateLine: string }[];

  private now = DateTime.now().toMillis();

  // private changes: { task: Task, complete?: boolean, snooze?: number }[] = [];

  @Input()
  set tasks(tasks: TaskWithBoard[]) {
    this.rows = tasks.map(w => ({
      task: w,
      inPast: w.task.due_date < this.now,
      dateLine: ClientUtils.formatOverdueDuration(DateTime.fromMillis(w.task.due_date)),
    })).sort((a, b) => a.task.task.due_date - b.task.task.due_date);
  }

  constructor(private remindersService: ReminderService, public state: State) {

  }

  ngOnInit(): void {
  }

  complete(task: TaskWithBoard) {
    this.rows.splice(this.rows.findIndex(r => r.task.task.id === task.task.id), 1);
    this.remindersService.completeAll([task]);
    if (this.rows.length === 0) {
      this.closed.emit();
    }
  }

  snooze(task: TaskWithBoard, minutes: number) {
    this.rows.splice(this.rows.findIndex(r => r.task.task.id === task.task.id), 1);
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

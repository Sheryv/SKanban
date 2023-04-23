import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Task } from '../../../../shared/model/entity/task';
import { DateTime } from 'luxon';
import { ClientUtils } from '../../../util/client-utils';
import { TaskService } from '../../../service/task.service';

@Component({
  selector: 'app-reminders-list',
  templateUrl: './reminders-list.component.html',
})
export class RemindersListComponent implements OnInit {


  @Output()
  closed = new EventEmitter<any>();

  rows: { task: Task, inPast: boolean, dateLine: string }[];

  private now = DateTime.now().toMillis();

  private changes: { task: Task, complete?: boolean, snooze?: number }[] = [];

  @Input()
  set tasks(tasks: Task[]) {
    this.rows = tasks.map(task => {
      return {
        task,
        inPast: task.due_date < this.now,
        dateLine: ClientUtils.formatDateForNextDay(DateTime.fromMillis(task.due_date)),
      };
    }).sort((a, b) => a.task.due_date - b.task.due_date);
  }

  constructor(private taskService: TaskService) {

  }

  ngOnInit(): void {
  }

  complete(task: Task) {
    this.changes.push({task, complete: true});
    this.rows.splice(this.rows.findIndex(r => r.task.id == task.id), 1);
    if (this.rows.length == 0) {
      this.apply();
    }
  }

  snooze(task: Task, minutes: number) {
    this.changes.push({task, snooze: minutes});
    this.rows.splice(this.rows.findIndex(r => r.task.id == task.id), 1);
    if (this.rows.length == 0) {
      this.apply();
    }
  }

  snoozeAll(minutes: number) {
    for (let row of this.rows.slice()) {
      this.snooze(row.task, minutes);
    }
  }

  completeAll() {
    for (let row of this.rows.slice()) {
      this.complete(row.task);
    }
  }

  private apply() {
    this.closed.emit()
  }
}

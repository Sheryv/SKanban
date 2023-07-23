import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder } from '@angular/forms';
import { TaskList } from '../../../../shared/model/entity/task-list';
import { Task } from '../../../../shared/model/entity/task';
import { MessageService } from '../../../service/message.service';
import { Label } from '../../../../shared/model/entity/label';
import { forkJoin, map, Observable, switchMap } from 'rxjs';
import { DbExecResult } from '../../../../shared/model/db';
import { LabelService } from '../../../service/label.service';
import { TASK_PRIORITY_ATTR } from '../../../../shared/model/entity/task-priority';
import { TASK_STATE_ATTR } from '../../../../shared/model/entity/task-state';
import { ClientUtils } from '../../../util/client-utils';
import { State } from '../../../service/state';
import { TaskService } from '../../../service/task.service';


@Component({
  selector: 'app-batch-action-dialog',
  templateUrl: 'batch-action-dialog.component.html',
})
export class BatchActionDialogComponent implements OnInit {

  priorityAttrs = TASK_PRIORITY_ATTR;
  stateAttrs = TASK_STATE_ATTR;
  value: any;
  labels: Label[];
  selectedLabels: Label[] = [];
  error: boolean;
  loading = false;

  constructor(
    public dialogRef: MatDialogRef<BatchActionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: BatchActionDialogParams,
    public labelService: LabelService,
    public taskService: TaskService,
    public state: State,
    public fb: FormBuilder,
    private msg: MessageService) {
  }

  ngOnInit() {
    this.labelService.getLabels(this.state.selectedBoard.value.id).subscribe(ls => {
      this.labels = ls.map(l => ClientUtils.mergeDeep({}, l));
    });
  }

  run() {
    switch (this.data.action) {
      case 'addLabels':
      case 'removeLabels':
        if (this.selectedLabels.length === 0) {
          this.error = true;
          return;
        }
        break;
      case 'moveToList':
      case 'setPriority':
      case 'setState':
        if (this.value == null || this.value === '') {
          this.error = true;
          return;
        }
        break;
    }
    this.error = false;
    this.loading = true;
    let obs: Observable<any>;
    switch (this.data.action) {
      case 'addLabels':
        obs = this.addLabelsIfMissing();
        break;
      case 'removeLabels':
        obs = this.removeLabelsIfPresent();
        break;
      case 'delete':
        obs = this.taskService.deleteTasks(this.data.tasks);
        break;

      case 'markAsDone':
        obs = this.taskService.markTasksAsDone(this.data.tasks, this.data.lists);
        break;
      case 'moveToList':
        obs = this.taskService.moveAllToList(this.data.tasks, this.data.lists, this.value);
        break;
      case 'setState':
        obs = forkJoin(this.data.tasks.map(t => {
          const prev = Object.assign({}, t);
          t.state = this.value;
          return this.taskService.addHistoryEntryOptional(t, prev);
        })).pipe(
          switchMap(res => this.taskService.saveTasks(this.data.tasks)),
        );
        break;
      case 'setPriority':
        obs = forkJoin(this.data.tasks.map(t => {
          const prev = Object.assign({}, t);
          t.priority = this.value;
          return this.taskService.addHistoryEntryOptional(t, prev);
        })).pipe(
          switchMap(res => this.taskService.saveTasks(this.data.tasks)),
        );
        break;
    }

    obs.subscribe(() => {
      this.loading = false;
      this.dialogRef.close();
      this.msg.success(`Mass operation completed for ${this.data.tasks.length} tasks`);
    });
  }


  addLabelsIfMissing(): Observable<DbExecResult[]> {
    const toAdd = this.selectedLabels.map(l => l.id);

    const missing = this.data.tasks.filter(t => t.$labels == null || !t.$labels.some(l => toAdd.includes(l.id)));
    return forkJoin(missing.flatMap(t => toAdd.map(id => this.labelService.addLabelToTask(id, t).pipe(map(exec => ({
      task: t,
      exec,
      labelId: id,
    }))))))
      .pipe(map(res => {
        for (const { task, labelId } of res.filter(e => e.exec != null)) {

          // this.state.taskChangeEvent.next(task);
          const label = this.selectedLabels.find(l => l.id === labelId);
          if (label) {
            task.$labels = task.$labels || [];
            task.$labels.push(label);
          }
        }

        return res.map(r => r.exec);
      }));
  }

  removeLabelsIfPresent(): Observable<DbExecResult[]> {
    const toRemove = this.selectedLabels.map(l => l.id);

    const present = this.data.tasks.filter(t => t.$labels && t.$labels.some(l => toRemove.includes(l.id)));
    return forkJoin(present.flatMap(t => toRemove.map(id => this.labelService.removeLabelFromTask(id, t).pipe(map(exec => ({
      task: t,
      exec,
      labelId: id,
    }))))))
      .pipe(map(res => {
        for (const { task, labelId } of res.filter(e => e.exec != null)) {

          task.$labels?.splice(task.$labels.findIndex(l => l.id === labelId), 1);
          // this.state.taskChangeEvent.next(task);
        }
        return res.map(r => r.exec);
      }));
  }

  addLabel(lbl: Label) {
    this.labels.splice(this.labels.indexOf(lbl), 1);
    this.selectedLabels.push(lbl);
  }

  removeLabel(lbl: Label) {
    this.selectedLabels.splice(this.selectedLabels.indexOf(lbl), 1);
    this.labels.push(lbl);
    this.labels = this.labels.sort((a, b) => a.title.localeCompare(b.title));
  }
}

export type BatchAction =
  'moveToList'
  | 'setPriority'
  | 'setState'
  | 'markAsDone'
  | 'removeLabels'
  | 'addLabels'
  | 'delete';


export interface BatchActionDialogParams {
  action: BatchAction;
  tasks: Task[];
  lists: TaskList[];
}

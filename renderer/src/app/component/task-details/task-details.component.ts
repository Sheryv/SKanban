/* eslint-disable no-underscore-dangle */
import { Component, EventEmitter, NgZone, OnInit, Output } from '@angular/core';
import { State } from '../../service/state';
import { Task } from '../../../shared/model/entity/task';
import { Factory } from '../../../shared/support/factory';
import { Settings, SettingsService } from '../../service/settings.service';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DateTime } from 'luxon';
import { LabelService } from '../../service/label.service';
import { MessageService } from '../../service/message.service';
import { filter, mergeMap, take, takeUntil, tap } from 'rxjs/operators';
import { ClientUtils, runInZone } from '../../util/client-utils';
import { TaskService } from '../../service/task.service';
import { Observable, of, Subject } from 'rxjs';
import { TaskHistory } from '../../../shared/model/entity/task-history';
import { TaskType } from '../../../shared/model/entity/task-type';
import { MarkdownUtils } from '../../util/marked-renderers';
import { NODE_CTX } from '../../global';
import { Label } from '../../../shared/model/entity/label';
import { TASK_PRIORITY_ATTR } from '../../../shared/model/entity/task-priority';
import { TASK_STATE_ATTR } from '../../../shared/model/entity/task-state';
import { MatDialog } from '@angular/material/dialog';
import { ViewService } from '../../service/view.service';
import { ACTIONS, KeyCommandsService } from '../../service/key-commands.service';
import { BaseComponent } from '../base.component';

@Component({
  selector: 'app-task-details',
  templateUrl: './task-details.component.html',
  styleUrls: ['./task-details.component.scss'],
})
export class TaskDetailsComponent extends BaseComponent implements OnInit {
  settings: Settings;
  form: FormGroup;
  text: string;
  labels: Label[];
  allLabels: Label[] = [];
  selectedLabels: Label[] = [];
  editMode = false;
  showHistory = false;
  showJson = false;
  taskTypes: Map<TaskType, string> = ClientUtils.TASK_TYPES_LABELS;

  @Output()
  saved: EventEmitter<Task> = new EventEmitter<Task>();
  // @Output()
  // closed: EventEmitter<Task> = new EventEmitter<Task>();

  priorityAttrs = TASK_PRIORITY_ATTR;
  stateAttrs = TASK_STATE_ATTR;

  keys = ACTIONS

  preRenderPreviewCallback: (s: string) => string;


  task: Task;
  private _history: TaskHistory[];
  private loading = false;

  private closeSb = new Subject<any>();

  constructor(private state: State,
              private labelService: LabelService,
              private message: MessageService,
              public settingsService: SettingsService,
              public viewService: ViewService,
              private taskService: TaskService,
              private zone: NgZone,
              private dialog: MatDialog,
              private fc: Factory,
              private keyService: KeyCommandsService,
              private fb: FormBuilder) {
    super();
    this.settings = settingsService.settingsDef;
    this.preRenderPreviewCallback = (md) => MarkdownUtils.preProcessContent(md, this.settings);
  }


  ngOnInit(): void {
    this.state.selectedBoard.pipe(this.bindLifeCycle()).subscribe(b => this.close());
    this.state.taskEditModeEnabled.pipe(this.bindLifeCycle()).subscribe(e => {
      this.editMode = e;
      this.reset();
    });
    this.state.selectedTask.pipe(this.bindLifeCycle()).subscribe(t => {
      this.updateSelectedTask(t);
      this.reset();
    });
    this.keyService.dialogAwareEmitter(ACTIONS.saveTask).pipe(filter(() => this.editMode)).subscribe(e => this.save());
  }

  reset() {
    if (!this.task) {
      return;
    }

    this.labelService.getLabels(this.state.selectedBoard.value.id).pipe(takeUntil(this.closeSb)).subscribe(ls => {
      this.allLabels = ls;
      this.closeSb.next(0);
      this.loading = false;
      const date = this.task.due_date && DateTime.fromMillis(this.task.due_date);

      this._history = null;
      this.text = JSON.stringify(this.task, null, 2);
      this.showHistory = false;
      this.showJson = false;

      this.form = this.fb.group({
        title: [this.task.title, [Validators.required]],
        content: [this.task.content, [Validators.max(30000)]],
        // eslint-disable-next-line @typescript-eslint/naming-convention
        due_date: [date],
        type: [this.task.type, [Validators.required]],
        priority: [this.task.priority, [Validators.required]],
        state: [this.task.state, [Validators.required]],
        handled: [this.task.handled > 0],
        $md: [''],
      });
      this.selectedLabels = (this.task.$labels && this.task.$labels.slice()) || [];
      this.labels = this.allLabels.slice().filter(a => this.selectedLabels.every(s => a.id !== s.id));
      if (NODE_CTX.isDevEnvironment) {
        console.log('reset to ', this.allLabels);
      }
    });
  }

  private saveAsync(prev: Task): Observable<any> {
    const form = this.form.value;

    const t: Task = {
      id: prev.id,
      bg_color: prev.bg_color,
      content: form.content,
      create_date: prev.create_date,
      deleted: prev.deleted,
      list_id: prev.list_id,
      position: prev.position,
      priority: form.priority,
      state: form.state,
      title: form.title,
      type: form.type,
      uuid: prev.uuid,
      $labels: this.selectedLabels,
      due_date: form.due_date?.toMillis(),
      handled: form.handled ? (prev.handled > 0 ? prev.handled : DateTime.now().toMillis()) : 0,
      modify_date: DateTime.now().toMillis(),
    };

    if (t.due_date <= 0) {
      t.due_date = null;
    }
    return this.taskService.addHistoryEntryOptional(t, prev)
      .pipe(
        take(1),
        mergeMap(res => this.taskService.saveTask(t)),
        mergeMap(res => this.labelService.setLabelsForTask(t, this.selectedLabels)),
        take(1),
        tap({
          next: (a) => {
            // const strings = this.selectedLabels.map(l => l.title);
            // if (NODE_CTX.isDevEnvironment) {
            //   console.log('lb after save', strings);
            // }
            // t.$labels = this.selectedLabels;
            // const prevList = this.state.currentBoard.$lists.find(l => l.id === t.list_id);
            // if (prevList) {
            //   const find = prevList.$tasks.find(tt => tt.id === t.id);
            //   if (find) {
            //     Object.assign(find, t);
            //   }
            // }
            // this.saved.emit(t);
            this.message.successShort('Task saved');
            this.state.taskEditModeEnabled.next(false);
          }, error: (e) => {
            console.error('close e');
          },
        }),
      );
  }

  save() {
    this.saveAsync(this.task).subscribe();
  }

  cancel() {
    this.state.taskEditModeEnabled.next(false);
    if (this.form && this.form.dirty) {
      this.message.warn('Closed without saving');
    }
  }

  close() {
    this.closeSb.next(0);
    (this.form && this.form.dirty ? this.saveAsync(this.task) : of(null)).subscribe(v => this.state.taskEditModeEnabled.next(false));
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

  startEdit(control: string = 'task-name') {
    this.state.taskEditModeEnabled.next(true);
    if (control) {
      setTimeout(() => {
        try {
          const elementRef = document.querySelector(control) as HTMLElement;

          if (elementRef) {
            if (elementRef.tagName.toLowerCase() === 'app-monaco-editor') {
              (window as any).monaco?.editor?.focus();
              console.log('focused', (window as any).monaco?.editor);
            } else {
              elementRef.focus();
            }
          }
        } catch (e) {

        }
      }, 1000);
    }
  }

  private updateSelectedTask(value: Task | null): Task | null {
    const prev = this.task;
    if (prev && value == null) {
      this.close();
    }
    if (prev && this.form && this.form.dirty) {
      this.saveAsync(this.task).subscribe(() => {
        this.task = value;
        this.reset();
      });
    }
    this.task = value;

    return prev;
  }


  get history() {
    if (!this._history && !this.loading) {
      this.loading = true;
      this.taskService.getHistory(this.task.id).pipe(runInZone(this.zone), takeUntil(this.closeSb)).subscribe(history => {
        history.sort((a, b) => b.history_date - a.history_date);
        history.forEach(h => {
          if (h.$task.labels?.length > 0) {
            h.$labels = this.allLabels.filter(lb => h.$task.labels.includes(lb.id));
          }
        });

        this.loading = false;
        this._history = history;
      });
    }

    return this._history;
  }


  restoreFromHistory(h: TaskHistory) {
    this.form.controls.title.setValue(h.$task.title);
    this.form.controls.content.setValue(h.$task.content);
    this.form.controls.due_date.setValue(h.$task.due_date != null ? DateTime.fromMillis(h.$task.due_date) : null);
    this.form.controls.type.setValue(h.$task.type);
    this.form.controls.priority.setValue(h.$task.priority);
    this.form.controls.state.setValue(h.$task.state);
    this.form.controls.handled.setValue(h.$task.handled > 0);
    this.selectedLabels = h.$labels;

    this.message.success('History data was filled in the form');
  }


  pickDate(dueDate: AbstractControl<DateTime>) {
    console.log('due date form click');
    this.viewService.openDatepicker(dueDate, false, true);
  }
}

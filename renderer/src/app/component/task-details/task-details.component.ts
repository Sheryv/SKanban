import { Component, EventEmitter, HostListener, Input, NgZone, OnDestroy, OnInit, Output } from '@angular/core';
import { State } from '../../service/state';
import { Task } from '../../../shared/model/entity/task';
import { Factory } from '../../../shared/./support/factory';
import { SettingsService } from '../../service/settings.service';
import { UiSettings } from '../../../shared/model/entity/settings';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DateTime } from 'luxon';
import { LabelService } from '../../service/label.service';
import { MessageService } from '../../service/message.service';
import { mergeMap, take, takeUntil, tap } from 'rxjs/operators';
import { ClientUtils, runInZone } from '../../util/client-utils';
import { TaskService } from '../../service/task.service';
import { TaskList } from '../../../shared/model/entity/task-list';
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

@Component({
  selector: 'app-task-details',
  templateUrl: './task-details.component.html',
  styleUrls: ['./task-details.component.scss'],
})
export class TaskDetailsComponent implements OnInit, OnDestroy {

  private _task: Task;
  private _history: TaskHistory[];
  private loading: boolean = false;

  private closeSb = new Subject<any>();
  private destroy = new Subject<any>();

  ui: UiSettings;
  @Input()
  list: TaskList;
  form: FormGroup;
  text: string;
  labels: Label[];
  allLabels: Label[] = [];
  selectedLabels: Label[] = [];
  editMode = false;
  showHistory: boolean = false;
  showJson: boolean = false;
  taskTypes: Map<TaskType, string> = ClientUtils.TASK_TYPES_LABELS;

  @Output()
  saved: EventEmitter<Task> = new EventEmitter<Task>();
  @Output()
  closed: EventEmitter<Task> = new EventEmitter<Task>();
  options = MarkdownUtils.editorOptions();

  priorityAttrs = TASK_PRIORITY_ATTR;
  stateAttrs = TASK_STATE_ATTR;

  preRenderPreviewCallback: (s: string) => string;

  get task(): Task {
    return this._task;
  }

  @Input()
  set task(value: Task) {
    if (this._task && value == null) {
      this.close();
    }
    if (this._task) {
      if (this.form && this.form.dirty) {
        this.saveAsync(this._task).subscribe(() => {
          this._task = value;
          this.reset();
        });
      } else {
        this._task = value;
        this.reset();
      }
    }
    this._task = value;
  }

  constructor(private state: State,
              private labelService: LabelService,
              private message: MessageService,
              public settingsService: SettingsService,
              public viewService: ViewService,
              private taskService: TaskService,
              private zone: NgZone,
              private dialog: MatDialog,
              private fc: Factory,
              private fb: FormBuilder) {
    this.ui = settingsService.base.ui;
    this.preRenderPreviewCallback = (md) => {
      return MarkdownUtils.preProcessContent(md, this.ui);
    };
  }


  ngOnInit(): void {
    this.reset();

    this.state.boardChanged.pipe(takeUntil(this.destroy)).subscribe(b => this.close());
    this.state.editMode.pipe(takeUntil(this.destroy)).subscribe(b => this.startEdit());
  }

  reset() {
    this.labelService.getLabels(this.list.board_id).pipe(runInZone(this.zone), takeUntil(this.closeSb)).subscribe(ls => {
      this.allLabels = ls;
      this.closeSb.next(0);
      this.loading = false;
      const date = this._task.due_date && DateTime.fromMillis(this._task.due_date);

      this._history = null;
      this.text = JSON.stringify(this._task, null, 2);
      this.showHistory = false;
      this.showJson = false;

      this.form = this.fb.group({
        title: [this._task.title, [Validators.required]],
        content: [this._task.content, [Validators.max(10000)]],
        due_date: [date],
        type: [this._task.type, [Validators.required]],
        priority: [this._task.priority, [Validators.required]],
        state: [this._task.state, [Validators.required]],
        handled: [this._task.handled != null],
        $md: [''],
      });
      this.selectedLabels = (this._task.$labels && this._task.$labels.slice()) || [];
      this.labels = this.allLabels.slice().filter(a => this.selectedLabels.every(s => a.id !== s.id));
      if (NODE_CTX.isDevEnvironment) {
        console.log('reset to ', this.allLabels);
      }
    });
  }

  private saveAsync(prev: Task): Observable<any> {
    this.editMode = false;
    const t = Object.assign({}, prev);

    Object.assign(t, this.form.value);
    t.$labels = this.selectedLabels;
    t.due_date = this.form.value.due_date?.toMillis();
    if (t.due_date <= 0) {
      t.due_date = null;
    }
    t.handled = this.form.value.handled ? (t.handled || DateTime.now().toMillis()) : null;
    t.modify_date = DateTime.now().toMillis();
    return this.taskService.addHistoryEntryOptional(t, prev)
      .pipe(
        take(1),
        mergeMap(res => this.taskService.saveTask(t)),
        mergeMap(res => {
          return this.labelService.setLabelsForTask(t, this.selectedLabels);
        }),
        take(1),
        runInZone(this.zone),
        tap(r => {
          const strings = this.selectedLabels.map(l => l.title);
          if (NODE_CTX.isDevEnvironment) {
            console.log('lb after save', strings);
          }
          t.$labels = this.selectedLabels;
          const prevList = this.state.currentBoard.$lists.find(l => l.id === t.list_id);
          if (prevList) {
            const find = prevList.$tasks.find(tt => tt.id === t.id);
            if (find) {
              Object.assign(find, t);
            }
          }
          this.saved.emit(t);
          this.message.successShort('Task saved');
          this.reset();
        }, error1 => {
          console.error('close e');
        }),
      );
  }

  save() {
    this.saveAsync(this.task).subscribe();
  }

  cancel() {
    this.editMode = false;
    if (this.form && this.form.dirty) {
      this.message.warn('Closed without saving');
    }
  }

  close() {
    this.closeSb.next(0);
    (this.form && this.form.dirty ? this.saveAsync(this.task) : of(null)).subscribe(v => this.editMode = false);
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
    this.reset();
    this.editMode = true;
    if (control) {
      setTimeout(() => {
        try {
          const elementRef = document.querySelector(control) as HTMLElement;

          if (elementRef) {
            if (elementRef.tagName.toLowerCase() == 'app-monaco-editor') {
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


  get history() {
    if (!this._history && !this.loading) {
      this.loading = true;
      this.taskService.getHistory(this._task.id).pipe(runInZone(this.zone), takeUntil(this.closeSb)).subscribe(history => {
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

  editorValue($event: string) {
    console.log('value changed ', $event.slice(0, 30));
  }

  ngOnDestroy(): void {
    this.destroy.next(true);
  }

  @HostListener('window:keydown.escape', ['$event'])
  handleEscape(event: KeyboardEvent) {
    if (this.editMode) {
      this.cancel();
    } else {
      this.closed.emit(this.task);
    }
  }

  @HostListener('window:keydown.control.shift.e', ['$event'])
  handleEditKey(event: KeyboardEvent) {
    if (!this.editMode) {
      this.startEdit();
    }
  }

  @HostListener('window:keydown.f2', ['$event'])
  handleEditKey2(event: KeyboardEvent) {
    if (!this.editMode) {
      this.startEdit();
    }
  }

  @HostListener('window:keydown.control.enter', ['$event'])
  handleSaveKey(event: KeyboardEvent) {
    if (this.editMode) {
      this.save();
    }
  }


}

import { Component, EventEmitter, HostListener, Input, NgZone, OnInit, Output, Renderer2 } from '@angular/core';
import { State } from '../../service/state';
import { Task } from '../../model/task';
import { Factory } from '../../service/factory';
import { SettingsService } from '../../service/settings.service';
import { UiSettings } from '../../model/settings';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DateTime } from 'luxon';
import { Label } from '../../model/label';
import { LabelService } from '../../service/label.service';
import { MessageService } from '../../service/message.service';
import { mergeMap, take, zip } from 'rxjs/operators';
import { ClientUtils, runInZone } from '../../util/client-utils';
import { TaskService } from '../../service/task.service';
import { TaskList } from '../../model/task-list';
import { HistoryType } from '../../model/history-type';
import { forkJoin, Observable, of } from 'rxjs';
import { DbExecResult } from '../../../shared/model/db-exec-result';
import { TaskHistory } from '../../model/task-history';

@Component({
  selector: 'app-task-details',
  templateUrl: './task-details.component.html',
  styleUrls: ['./task-details.component.scss'],
})
export class TaskDetailsComponent implements OnInit {
  
  private _task: Task;
  ui: UiSettings;
  @Input()
  list: TaskList;
  form: FormGroup;
  text: string;
  labels: Label[];
  allLabels: Label[] = [];
  selectedLabels: Label[] = [];
  editMode = false;
  history: TaskHistory[] = [];
  historyTypes = HistoryType;
  @Output()
  saved: EventEmitter<Task> = new EventEmitter<Task>();
  @Output()
  closed: EventEmitter<Task> = new EventEmitter<Task>();
  
  get task(): Task {
    return this._task;
  }
  
  @Input()
  set task(value: Task) {
    if (this._task && value == null) {
      this.cancel();
    }
    if (this._task) {
      this._task = value;
      this.reset();
    }
    this._task = value;
  }
  
  constructor(private state: State,
              private labelService: LabelService,
              private message: MessageService,
              public settingsService: SettingsService,
              public render: Renderer2,
              private taskService: TaskService,
              private zone: NgZone,
              private fc: Factory,
              private fb: FormBuilder) {
    this.ui = settingsService.base.ui;
    
    
  }
  
  
  ngOnInit(): void {
    this.labelService.getLabels(this.list.board_id).pipe(runInZone(this.zone)).subscribe(ls => {
      this.allLabels = ls;
      this.reset();
    });
  }
  
  reset() {
    const date = this._task.due_date && DateTime.fromMillis(this._task.due_date).toJSDate();
    
    this.taskService.getHistory(this._task.id).pipe(runInZone(this.zone)).subscribe(h => {
      h.forEach(i => i.$label = ClientUtils.mapHistoryType(i.type));
      h.sort((a, b) => b.history_date - a.history_date);
      this.history = h;
    });
    this.text = JSON.stringify(this._task, null, 2);
    
    this.form = this.fb.group({
      title: [this._task.title, [Validators.required]],
      content: [this._task.content, [Validators.max(10000)]],
      due_date: [date],
    });
    this.selectedLabels = (this._task.$labels && this._task.$labels.slice()) || [];
    this.labels = this.allLabels.slice().filter(a => this.selectedLabels.every(s => a.id !== s.id));
    console.log('reset to ', this.allLabels);
  }
  
  save() {
    this.editMode = false;
    const t = Object.assign({}, this.task);
    
    Object.assign(t, this.form.value);
    t.$labels = this.selectedLabels;
    t.due_date = DateTime.fromJSDate(this.form.value.due_date).toMillis();
    if (isNaN(t.due_date)) {
      t.due_date = null;
    }
    t.modify_date = Date.now();
    this.createHistory(this.task, t)
      .pipe(
        take(1),
        mergeMap(res => this.taskService.saveTask(t)),
        mergeMap(res => {
          return this.labelService.setLabelsForTask(t, this.selectedLabels);
        }),
        take(1),
        runInZone(this.zone),
      )
      .subscribe(r => {
        Object.assign(this._task, t);
        const strings = this.selectedLabels.map(l => l.title);
        console.log('lb after save', strings);
        this._task.$labels = this.selectedLabels;
        this.saved.emit(this._task);
        this.message.successShort('Task saved');
        this.reset();
      }, error1 => {
        console.error('close e');
      });
  }
  
  cancel() {
    this.editMode = false;
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
    setTimeout(() => {
      const elementRef = this.render.selectRootElement('#' + control);
      if (elementRef) {
        elementRef.focus();
      }
    }, 10);
  }
  
  createHistory(prev: Task, edited: Task): Observable<DbExecResult[]> {
    const ob: Observable<DbExecResult>[] = [];
    if (prev.title !== edited.title) {
      ob.push(this.taskService.addHistoryEntry(prev, HistoryType.TITLE_MODIFY));
    }
    if (prev.content !== edited.content) {
      ob.push(this.taskService.addHistoryEntry(prev, HistoryType.CONTENT_MODIFY));
    }
    if (prev.state !== edited.state) {
      ob.push(this.taskService.addHistoryEntry(prev, HistoryType.STATE_MODIFY));
    }
    if (prev.due_date !== edited.due_date) {
      ob.push(this.taskService.addHistoryEntry(prev, HistoryType.DUE_DATE_MODIFY));
    }
    return ob.length > 0 ? forkJoin(ob) : of(null);
  }
  
  filterLabels(ids: string) {
    const numbers = ids.split(',').map(s => Number(s)).filter(n => !isNaN(n));
    return this.allLabels.filter(lb => numbers.includes(lb.id));
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
  
}

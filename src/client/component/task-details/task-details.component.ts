import { Component, ElementRef, EventEmitter, HostListener, Input, NgZone, OnInit, Output, QueryList, Renderer2, ViewChild, ViewChildren } from '@angular/core';
import { State } from '../../service/state';
import { Task } from '../../model/task';
import { Factory } from '../../service/factory';
import { SettingsService } from '../../service/settings.service';
import { UiSettings } from '../../model/settings';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { DateTime } from 'luxon';
import { Label } from '../../model/label';
import { LabelService } from '../../service/label.service';
import { MessageService } from '../../service/message.service';
import { mergeMap, take } from 'rxjs/operators';
import { runInZone } from '../../util/client-utils';
import { TaskService } from '../../service/task.service';
import { TaskList } from '../../model/task-list';

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
    const v = this.form.value;
    const t = this.task;
    
    Object.assign(t, this.form.value);
    t.$labels = this.selectedLabels;
    t.due_date = DateTime.fromJSDate(this.form.value.due_date).toMillis();
    if (isNaN(t.due_date)) {
      t.due_date = null;
    }
    this.taskService.saveTask(t)
      .pipe(
        take(1),
        mergeMap(res => {
          return this.labelService.setLabelsForTask(t, this.selectedLabels);
        }),
        take(1),
        runInZone(this.zone),
      )
      .subscribe(r => {
        this.saved.emit(this.task);
        this.message.successShort('Task saved');
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

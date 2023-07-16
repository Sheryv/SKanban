import { AfterViewInit, Component, ElementRef, Inject, NgZone, OnInit, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TaskList } from '../../../../shared/model/entity/task-list';
import { LabelService } from '../../../service/label.service';
import { TaskService } from '../../../service/task.service';
import { Factory } from '../../../../shared/support/factory';
import { switchMap, take } from 'rxjs/operators';
import { ClientUtils } from '../../../util/client-utils';
import { SettingsService } from '../../../service/settings.service';
import { Label } from '../../../../shared/model/entity/label';
import { ViewService } from '../../../service/view.service';
import { TASK_PRIORITY_ATTR, TaskPriority } from '../../../../shared/model/entity/task-priority';
import { TASK_STATE_ATTR, TaskState } from '../../../../shared/model/entity/task-state';
import { ACTIONS } from '../../../service/key-commands.service';
import { BaseComponent } from '../../base.component';

@Component({
  selector: 'app-create-task-dialog',
  templateUrl: 'create-task-dialog.component.html',
})
export class CreateTaskDialogComponent extends BaseComponent implements OnInit, AfterViewInit {

  @ViewChild('name', { static: true })
  nameInput: ElementRef;
  form: FormGroup;
  labels: Label[] = [];
  selectedLabels: Label[] = [];
  // options = MarkdownUtils.editorOptions();
  // preRenderPreviewCallback: (s: string) => string;
  priorityAttrs = TASK_PRIORITY_ATTR;
  stateAttrs = TASK_STATE_ATTR;

  keys = ACTIONS

  constructor(
    fb: FormBuilder,
    private dialogRef: MatDialogRef<CreateTaskDialogComponent>,
    private labelService: LabelService,
    private settings: SettingsService,
    private taskService: TaskService,
    private dialog: MatDialog,
    private fc: Factory,
    private zone: NgZone,
    public viewService: ViewService,
    @Inject(MAT_DIALOG_DATA) public list: TaskList) {


    super();
    // this.preRenderPreviewCallback = (md) => MarkdownUtils.preProcessContent(md, this.settings.settingsDef);

    this.form = fb.group({
      name: ['T' + (Math.floor(Math.random() * 90) + 10), Validators.compose([Validators.required, Validators.maxLength(100)])],
      content: ['', Validators.maxLength(30000)],
      dueDate: [],
      priority: [TaskPriority.MINOR, Validators.required],
      state: [TaskState.OPEN, Validators.required],
    });
  }


  save() {
    this.form.updateValueAndValidity();
    if (this.form.valid) {
      const v = this.form.value;

      const task = this.fc.createTask(v.name, v.content, this.list.id, 0, v.dueDate?.toMillis() || null);
      task.state = v.state;
      task.priority = v.priority;
      this.taskService.getTasksForList(this.list.id)
        .pipe(
          // mergeMap(tasks => {
          //   for (const item of tasks) {
          //     item.position = item.position + 1;
          //   }
          //   return this.taskService.updatePosition(tasks);
          // }),
          switchMap(tasks => {
            const max = Math.max(...tasks.map(t => t.position));
            task.position = max + 1;
            return this.taskService.saveTask(task);
          }),
          switchMap(res => {
            task.id = res.lastID;
            return this.taskService.moveTaskToTop(task);
          }),
          switchMap(() => this.labelService.setLabelsForTask(task, this.selectedLabels)),
          take(1),
        )
        .subscribe(r => {
          this.dialogRef.close(task);
        }, error1 => {
          console.error('e', error1);
        });
    } else {
    }
  }

  ngOnInit(): void {
    ACTIONS.saveTask.onTrigger(e => this.save(), this.destroyedEvent);
    this.labelService.getLabels(this.list.board_id).subscribe(ls => {
      this.labels = ls.map(l => ClientUtils.mergeDeep({}, l));
    });
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

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.nameInput.nativeElement.select();
    }, 5);
  }
}

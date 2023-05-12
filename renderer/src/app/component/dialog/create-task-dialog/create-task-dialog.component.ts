import { AfterViewInit, Component, ElementRef, Inject, NgZone, OnInit, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TaskList } from '../../../../shared/model/entity/task-list';
import { LabelService } from '../../../service/label.service';
import { TaskService } from '../../../service/task.service';
import { Factory } from '../../../../shared/./support/factory';
import { mergeMap, take } from 'rxjs/operators';
import { ClientUtils, runInZone } from '../../../util/client-utils';
import { SettingsService } from '../../../service/settings.service';
import { Label } from '../../../../shared/model/entity/label';
import { ViewService } from '../../../service/view.service';
import { TASK_PRIORITY_ATTR, TaskPriority } from '../../../../shared/model/entity/task-priority';
import { TASK_STATE_ATTR, TaskState } from '../../../../shared/model/entity/task-state';

@Component({
  selector: 'app-create-task-dialog',
  templateUrl: 'create-task-dialog.component.html',
})
export class CreateTaskDialogComponent implements OnInit, AfterViewInit {

  @ViewChild('name', { static: true })
  nameInput: ElementRef;
  form: FormGroup;
  labels: Label[] = [];
  selectedLabels: Label[] = [];
  // options = MarkdownUtils.editorOptions();
  // preRenderPreviewCallback: (s: string) => string;
  priorityAttrs = TASK_PRIORITY_ATTR;
  stateAttrs = TASK_STATE_ATTR;

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


    // this.preRenderPreviewCallback = (md) => MarkdownUtils.preProcessContent(md, this.settings.settingsDef);

    this.form = fb.group({
      name: ['T' + (Math.floor(Math.random() * 90) + 10), Validators.compose([Validators.required, Validators.maxLength(100)])],
      content: ['', Validators.maxLength(30000)],
      dueDate: [],
      priority: [TaskPriority.MAJOR, Validators.required],
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
      this.taskService.getTasks(this.list.id)
        .pipe(
          mergeMap(tasks => {
            for (const item of tasks) {
              item.position = item.position + 1;
            }
            return this.taskService.updatePosition(tasks);
          }),
          mergeMap(() => this.taskService.saveTask(task)),
          take(1),
          mergeMap(res => {
            task.id = res.lastID;
            return this.labelService.setLabelsForTask(task, this.selectedLabels);
          }),
          take(1),
          runInZone(this.zone),
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

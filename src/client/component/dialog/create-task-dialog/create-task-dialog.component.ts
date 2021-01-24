import { Component, Inject, NgZone, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DateTime } from 'luxon';
import { TaskList } from '../../../model/task-list';
import { LabelService } from '../../../service/label.service';
import { Label } from '../../../model/label';
import { TaskService } from '../../../service/task.service';
import { Factory } from '../../../service/factory';
import { mergeMap, take } from 'rxjs/operators';
import { ClientUtils, runInZone } from '../../../util/client-utils';
import { TaskType } from '../../../model/task-type';
import { MarkdownUtils } from '../../../util/marked-renderers';
import { SettingsService } from '../../../service/settings.service';

@Component({
  selector: 'app-create-task-dialog',
  templateUrl: 'create-task-dialog.component.html',
})
export class CreateTaskDialogComponent implements OnInit {
  
  form: FormGroup;
  labels: Label[] = [];
  selectedLabels: Label[] = [];
  taskTypes: Map<TaskType, string>;
  options = MarkdownUtils.editorOptions();
  preRenderPreviewCallback: (s: string) => string;
  
  constructor(
    fb: FormBuilder,
    private dialogRef: MatDialogRef<CreateTaskDialogComponent>,
    private labelService: LabelService,
    private settings: SettingsService,
    private taskService: TaskService,
    private fc: Factory,
    private zone: NgZone,
    @Inject(MAT_DIALOG_DATA) public list: TaskList) {
    
    const tomorrow = DateTime.local().plus({days: 1});
    this.taskTypes = ClientUtils.taskTypes;
    
    this.preRenderPreviewCallback = (md) => {
      return MarkdownUtils.preProcessContent(md, this.settings.base.ui);
    };
    
    this.form = fb.group({
      name: ['T' + (Math.floor(Math.random() * 90) + 10), [Validators.max(100)]],
      content: ['', [Validators.max(10000)]],
      due_date: [tomorrow.toJSDate()],
      type: [{value: TaskType.STANDARD, disabled: true}, [Validators.required]],
    });
    
    this.form.get('name').valueChanges.subscribe(n => {
      this.form.get('type').setValue(n ? TaskType.STANDARD : TaskType.NOTE);
    });
  }
  
  
  save() {
    this.form.updateValueAndValidity();
    if (this.form.valid) {
      const v = this.form.value;
      const millisecond = DateTime.fromJSDate(v.due_date).toMillis();
      const task = this.fc.createTask(v.name, v.content, this.list.id, this.list.$tasks.length, millisecond, this.form.get('type').value);
      this.taskService.saveTask(task)
        .pipe(
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
}

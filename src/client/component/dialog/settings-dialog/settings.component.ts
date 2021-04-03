import { Component, NgZone } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UiSettings } from '../../../model/settings';
import { State } from '../../../service/state';
import { MessageService } from '../../../service/message.service';
import { SettingsService } from '../../../service/settings.service';
import { MatDialogRef } from '@angular/material/dialog';
import { ClientUtils } from '../../../util/client-utils';
import { TaskSortField } from '../../../model/task-sort-field';
import { SortDirection } from '../../../model/sort-direction';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
})
export class SettingsComponent {
  
  ui: UiSettings;
  form: FormGroup;
  readonly numberPattern = /^\d+$/;
  taskOrders: Map<TaskSortField, string>;
  sortDir = SortDirection;
  
  constructor(private state: State,
              private message: MessageService,
              public settingsService: SettingsService,
              private dialogRef: MatDialogRef<SettingsComponent>,
              private zone: NgZone,
              private fb: FormBuilder) {
    this.ui = settingsService.base.ui;
    this.taskOrders = ClientUtils.taskOrderFields;
    this.form = fb.group({
      detailsWith: [this.ui.detailsWith, [Validators.required, Validators.min(10), Validators.max(90), Validators.pattern(this.numberPattern)]],
      taskListWidth: [this.ui.taskListWidth, [Validators.required, Validators.min(50), Validators.pattern(this.numberPattern)]],
      taskItemPadding: [this.ui.taskItemPadding, [Validators.required, Validators.min(10), Validators.pattern(this.numberPattern)]],
      taskItemSize: [this.ui.taskItemSize, [Validators.required, Validators.min(10), Validators.pattern(this.numberPattern)]],
      taskLabelShowText: [this.ui.taskLabelShowText, [Validators.required, Validators.min(0), Validators.max(1), Validators.pattern(this.numberPattern)]],
      taskShowContentSize: [this.ui.taskShowContentSize, [Validators.required, Validators.min(0), Validators.max(50), Validators.pattern(this.numberPattern)]],
      taskDueDateVisibility: [this.ui.taskDueDateVisibility],
      codeParserConfig: [this.ui.codeParserConfig],
      listVisibleTaskConfig: [],
    });
    this.form.setControl('listVisibleTaskConfig', new FormArray(this.ui.listVisibleTaskConfig.map(c => this.listConfig(c.name, c.sortBy, c.sortDir, c.minVisible, c.lastVisibleDays))));
  }
  
  private listConfig(name: string = '', sortBy: TaskSortField = TaskSortField.CREATE_DATE, sortDir: SortDirection = SortDirection.DESC, minVisible: number = 10, lastVisibleDays: number = 14) {
    return this.fb.group({
      name: [name, Validators.required],
      minVisible: [minVisible, [Validators.required, Validators.min(1), Validators.max(200), Validators.pattern(this.numberPattern)]],
      lastVisibleDays: [lastVisibleDays, [Validators.required, Validators.min(1), Validators.max(10000), Validators.pattern(this.numberPattern)]],
      sortBy: [sortBy, Validators.required],
      sortDir: [sortDir],
    });
  }
  
  save() {
    if (this.form.valid) {
      const u: UiSettings = {
        detailsWith: this.toNumber(this.form.value.detailsWith),
        taskListWidth: this.toNumber(this.form.value.taskListWidth),
        taskItemPadding: this.toNumber(this.form.value.taskItemPadding),
        taskItemSize: this.toNumber(this.form.value.taskItemSize),
        taskLabelShowText: this.toNumber(this.form.value.taskLabelShowText),
        taskShowContentSize: this.toNumber(this.form.value.taskShowContentSize),
        taskDueDateVisibility: this.toBool(this.form.value.taskDueDateVisibility),
        codeParserConfig: this.form.value.codeParserConfig,
        listVisibleTaskConfig: this.form.get('listVisibleTaskConfig').value,
      };
      this.dialogRef.close(u);
    } else {
      this.form.updateValueAndValidity();
    }
  }
  
  private toNumber(v: any) {
    return Number(v);
  }
  
  private toBool(v: any) {
    return v === 'true' || v === 'checked' || v === true;
  }
  
  deleteRow(control: AbstractControl, index: number) {
    const list = control as FormArray;
    list.removeAt(index);
  }
  
  addRow(listVisibleTaskConfig: AbstractControl) {
    const list = listVisibleTaskConfig as FormArray;
    list.push(this.listConfig());
  }
}

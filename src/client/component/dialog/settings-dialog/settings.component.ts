import { Component, NgZone, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UiSettings } from '../../../model/settings';
import { State } from '../../../service/state';
import { MessageService } from '../../../service/message.service';
import { SettingsService } from '../../../service/settings.service';
import { MatDialogRef } from '@angular/material/dialog';
import { toNumbers } from '@angular/compiler-cli/src/diagnostics/typescript_version';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
})
export class SettingsComponent {
  
  ui: UiSettings;
  form: FormGroup;
  
  constructor(private state: State,
              private message: MessageService,
              public settingsService: SettingsService,
              private dialogRef: MatDialogRef<SettingsComponent>,
              private zone: NgZone,
              private fb: FormBuilder) {
    this.ui = settingsService.base.ui;
    const numberPattern = /^\d+$/;
    this.form = fb.group({
      detailsWith: [this.ui.detailsWith, [Validators.required, Validators.min(10), Validators.max(90), Validators.pattern(numberPattern)]],
      taskListWidth: [this.ui.taskListWidth, [Validators.required, Validators.min(50), Validators.pattern(numberPattern)]],
      taskItemPadding: [this.ui.taskItemPadding, [Validators.required, Validators.min(10), Validators.pattern(numberPattern)]],
      taskItemSize: [this.ui.taskItemSize, [Validators.required, Validators.min(10), Validators.pattern(numberPattern)]],
      taskLabelShowText: [this.ui.taskLabelShowText, [Validators.required, Validators.min(0), Validators.max(1), Validators.pattern(numberPattern)]],
      taskShowContentSize: [this.ui.taskShowContentSize, [Validators.required, Validators.min(0), Validators.max(50), Validators.pattern(numberPattern)]],
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
      };
      this.dialogRef.close(u);
    } else {
      this.form.updateValueAndValidity();
    }
  }
  
  private toNumber(v: any) {
    return Number(v);
  }
}

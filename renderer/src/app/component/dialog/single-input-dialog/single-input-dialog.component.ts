import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormControl, ValidationErrors, ValidatorFn } from '@angular/forms';

@Component({
  selector: 'app-single-input-dialog',
  templateUrl: 'single-input-dialog.component.html',
})
export class SingleInputDialogComponent {
  name: FormControl;
  data: DialogParams;

  constructor(
    public dialogRef: MatDialogRef<SingleInputDialogComponent>,
    @Inject(MAT_DIALOG_DATA) params: DialogParams) {

    this.data = {label: '', title: 'Provide value'};
    Object.assign(this.data, params);

    this.name = new FormControl(null, this.data.validator);
    this.name.setValue(this.data.value);
  }

  save() {
    if (this.name.valid) {
      this.dialogRef.close(this.name.value);
    } else {
      this.name.updateValueAndValidity();
    }
  }
}

export interface DialogParams {
  label?: string;
  validator?: ValidatorFn;
  errors?: Record<string, string>;
  title: string;
  value?: string;
}

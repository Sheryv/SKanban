import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormControl, Validators } from '@angular/forms';

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
    
    this.data = {label: 'Name', required: true, title: 'Input'};
    Object.assign(this.data, params);
    
    if (this.data.required) {
      this.name = new FormControl(null, Validators.required);
    } else {
      this.name = new FormControl();
    }
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
  required?: boolean;
  title: string;
  value?: string;
}

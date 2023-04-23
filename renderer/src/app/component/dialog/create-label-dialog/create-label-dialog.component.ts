import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormControl, Validators } from '@angular/forms';

@Component({
  selector: 'app-create-label-dialog',
  templateUrl: 'create-label-dialog.component.html',
})
export class CreateLabelDialogComponent {
  name: FormControl;
  color = '#4b4e54';
  
  constructor(
    public dialogRef: MatDialogRef<CreateLabelDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any) {
    
    this.name = new FormControl(null, Validators.required);
  }
  
  save() {
    if (this.name.valid) {
      this.dialogRef.close({name: this.name.value, color: this.color});
    } else {
      this.name.updateValueAndValidity();
    }
  }
}

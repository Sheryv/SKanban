import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-create-label-dialog',
  templateUrl: 'create-label-dialog.component.html',
})
export class CreateLabelDialogComponent {
  name: string;
  
  constructor(
    public dialogRef: MatDialogRef<CreateLabelDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any) {
  }
  
}

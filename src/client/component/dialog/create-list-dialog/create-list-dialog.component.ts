import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-create-list-dialog',
  templateUrl: 'create-list-dialog.component.html',
})
export class CreateListDialogComponent {
  name: string;
  
  constructor(
    public dialogRef: MatDialogRef<CreateListDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any) {
  }
  
}

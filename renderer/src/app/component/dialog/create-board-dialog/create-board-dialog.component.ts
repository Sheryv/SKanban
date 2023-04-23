import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-create-board-dialog',
  templateUrl: 'create-board-dialog.component.html',
})
export class CreateBoardDialogComponent {
  name: string;
  
  constructor(
    public dialogRef: MatDialogRef<CreateBoardDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any) {
  }
  
}

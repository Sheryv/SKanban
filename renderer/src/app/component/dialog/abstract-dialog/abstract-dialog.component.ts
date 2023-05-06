import { Component, Inject, TemplateRef } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-abstract-dialog',
  templateUrl: 'abstract-dialog.component.html',
})
export class AbstractDialogComponent {

  // returns null if correct
  constructor(
    public dialogRef: MatDialogRef<AbstractDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogCreateParams) {
  }

  accept() {
    if (this.data.params.onPreviewAccept && this.data.params.onPreviewAccept(this.dialogRef) == null) {
      this.dialogRef.close(this.data.templateData);
    } else {
      this.dialogRef.close(this.data.templateData);
    }
  }
}

export interface DialogTemplateParams {
  dialog: MatDialogRef<AbstractDialogComponent>;
  data?: Record<string, any>;
}

export interface DialogCreateParams {
  templateData?: DialogTemplateParams['data'];
  params: {
    title: string;
    template: TemplateRef<DialogTemplateParams>;
    onPreviewAccept?: (dialog: MatDialogRef<AbstractDialogComponent>) => any;
    acceptButtonLabel?: string;
  };
}

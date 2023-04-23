import { Component, Inject, NgZone } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormControl, Validators } from '@angular/forms';
import { Board } from '../../../../shared/model/entity/board';
import { TaskService } from '../../../service/task.service';
import { MessageService } from '../../../service/message.service';
import { runInZone } from '../../../util/client-utils';

@Component({
  selector: 'app-board-settings-dialog',
  templateUrl: 'board-settings-dialog.component.html',
})
export class BoardSettingsDialogComponent {
  name: FormControl;

  constructor(
    public dialogRef: MatDialogRef<BoardSettingsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Board,
    private taskService: TaskService,
    private msg: MessageService,
    private zone: NgZone,
  ) {

    this.name = new FormControl(null, Validators.required);
    this.name.setValue(data.title);
  }

  save() {
    if (this.name.valid) {
      this.dialogRef.close(this.name.value);
    } else {
      this.name.updateValueAndValidity();
    }
  }

  delete() {
    this.data.deleted = Date.now();
    this.taskService.saveBoard(this.data).pipe(runInZone(this.zone)).subscribe(c => {
      this.dialogRef.close();
      this.msg.success('Board deleted');
    });
  }
}

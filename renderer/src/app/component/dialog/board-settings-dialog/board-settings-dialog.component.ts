import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormControl, Validators } from '@angular/forms';
import { Board } from '../../../../shared/model/entity/board';
import { TaskService } from '../../../service/task.service';
import { MessageService } from '../../../service/message.service';
import { ListService } from '../../../service/list.service';

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
    private listService: ListService,
    private msg: MessageService,
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
    this.listService.saveBoard(this.data).subscribe(c => {
      this.dialogRef.close();
      this.msg.success('Board deleted');
    });
  }
}

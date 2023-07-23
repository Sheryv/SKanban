import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { Board } from '../../shared/model/entity/board';
import { Task } from '../../shared/model/entity/task';

@Injectable({
  providedIn: 'root',
})
export class State {
  selectedBoard = new BehaviorSubject<Board>(null);
  taskChangeEvent = new Subject<Task>();
  listMode = new BehaviorSubject<{ arg?: string; mode: ListMode }>({ mode: 'normal' });

  taskFiltersDisabled: boolean;

  taskEditModeEnabled = new BehaviorSubject<boolean>(false);

  selectedTask = new BehaviorSubject<Task | null>(null);

  constructor() {
    this.selectedTask.subscribe(() => {
      if (this.taskEditModeEnabled.value) {
        this.taskEditModeEnabled.next(false);
      }
    });
  }

  changeListMode(mode: ListMode, arg: string = null) {
    if (mode != null && (mode !== 'normal' && this.listMode.value.mode === 'normal' || mode === 'normal' || this.listMode.value.mode === mode)) {
      this.listMode.next({ mode, arg });
    } else {
      console.error(`Cannot change mode ${this.listMode.value.mode} --> ${mode}`);
    }
  }
}

export type ListMode = 'normal' | 'quicksearch' | 'advanced';

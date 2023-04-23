import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { Board } from '../../shared/model/entity/board';
import { Task } from '../../shared/model/entity/task';

@Injectable({
  providedIn: 'root',
})
export class State {
  boardChanged = new Subject<Board>();
  taskChanged = new Subject<Task>();
  search = new Subject<{ term: string, enabled: boolean }>();
  currentBoard: Board;

  editMode = new Subject<any>();

  constructor() {
    this.boardChanged.subscribe((b) => this.currentBoard = b);
  }
}

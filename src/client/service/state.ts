import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { Board } from '../model/board';

@Injectable()
export class State {
  boardChanged = new Subject<Board>();
  currentBoard: Board;
  
  constructor() {
    this.boardChanged.subscribe((b) => this.currentBoard = b);
  }
}

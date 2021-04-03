import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { Board } from '../model/board';

@Injectable({
  providedIn: 'root',
})
export class State {
  boardChanged = new Subject<Board>();
  search = new Subject<{ term: string, enabled: boolean }>();
  currentBoard: Board;
  
  constructor() {
    this.boardChanged.subscribe((b) => this.currentBoard = b);
  }
}

// @ts-ignore
import { Component, OnInit } from '@angular/core';
import { State } from '../../service/state';
import { Board } from '../../model/board';
import { TaskList } from '../../model/task-list';
import { Task } from '../../model/task';
import { Factory } from '../../service/factory';
import { SettingsService } from '../../service/settings.service';
import { TaskLabel } from '../../model/task-label';
import { Label } from '../../model/label';
import { UiSettings } from '../../model/settings';

@Component({
  selector: 'app-lists',
  templateUrl: './lists.component.html',
  styleUrls: ['./lists.component.scss'],
})
export class ListsComponent implements OnInit {
  board: Board;
  lists: TaskList[];
  visibleTask: Task;
  ui: UiSettings;
  
  constructor(private state: State, private factory: Factory, public settingsService: SettingsService) {
    state.boardChanged.subscribe((b) => this.changeBoard(b));
    this.ui = settingsService.base.ui;
    this.changeBoard(state.currentBoard);
  }
  
  ngOnInit(): void {
  }
  
  changeBoard(b: Board) {
    if (b && b.title !== 'Test') {
      this.board = b;
      console.log('Config: ', this.ui);
      const fc = this.factory;
      this.lists = [fc.createList('Todo', 1), fc.createList('In progress', 1)];
      this.lists[1].id = 2;
      this.lists[0].id = 1;
      this.lists[0].tasks = [fc.createTask('Task 1', 'content 1', 1), fc.createTask('Task 2', 'content 2', 2)];
      this.lists[1].tasks = [];
      for (let i = 0; i < 20; i++) {
        const task = fc.createTask('Task ' + (i + 3), 'content ' + (i + 3), 2);
        task.$labels = this.randomLabel();
        this.lists[1].tasks.push(task);
      }
    } else {
      this.lists = null;
    }
  }
  
  randomLabel(): Label[] {
    const la: Label[] = [];
    let number = Math.floor(Math.random() * 15) - 5;
    if (number < 0) {
      number = 0;
    }
    for (let i = 0; i < number; i++) {
      const random = Math.random();
      if (random < 0.1) {
      } else if (random < 0.4) {
        la.push(this.factory.createLabel('Trivial', '#23123'));
      } else {
        la.push(this.factory.createLabel('Inner', this.randomColor()));
      }
    }
    return la;
  }
  
  randomColor(): string {
    const r = Math.floor(Math.random() * 255);
    const g = Math.floor(Math.random() * 255);
    const b = Math.floor(Math.random() * 255);
    return `rgb(${r}, ${g}, ${b})`;
  }
  
  addTask() {
  
  }
  
  selectTask(task: Task) {
    console.log('Change task', task);
    this.visibleTask = task;
  }
}

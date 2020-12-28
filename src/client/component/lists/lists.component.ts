import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { State } from '../../service/state';
import { Board } from '../../model/board';
import { TaskList } from '../../model/task-list';
import { Task } from '../../model/task';
import { Factory } from '../../service/factory';
import { SettingsService } from '../../service/settings.service';
import { TaskLabel } from '../../model/task-label';
import { Label } from '../../model/label';
import { UiSettings } from '../../model/settings';
import { KeyCommandsService } from '../../service/key-commands.service';
import { mergeMap, take, takeUntil, tap } from 'rxjs/operators';
import { of, Subject, throwError, zip } from 'rxjs';
import { TaskService } from '../../service/task.service';
import { CreateBoardDialogComponent } from '../dialog/create-board-dialog/create-board-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { CreateListDialogComponent } from '../dialog/create-list-dialog/create-list-dialog.component';
import { runInZone } from '../../util/client-utils';
import { CreateTaskDialogComponent } from '../dialog/create-task-dialog/create-task-dialog.component';
import { MessageService } from '../../service/message.service';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-lists',
  templateUrl: './lists.component.html',
  styleUrls: ['./lists.component.scss'],
})
export class ListsComponent implements OnInit, OnDestroy {
  board: Board;
  lists: TaskList[];
  visibleTask: Task;
  ui: UiSettings;
  selectedList: TaskList;
  activeState = new Subject<any>();
  loading: boolean;
  
  
  constructor(private state: State, private factory: Factory, public settingsService: SettingsService, private keyService: KeyCommandsService,
              private taskService: TaskService, private msg: MessageService, private dialog: MatDialog, private zone: NgZone,
  ) {
    state.boardChanged.subscribe((b) => this.changeBoard(b));
    this.ui = settingsService.base.ui;
    this.changeBoard(state.currentBoard);
  }
  
  ngOnInit(): void {
    console.log('Config: ', this.ui);
    this.keyService.addEvent.emitter.pipe(takeUntil(this.activeState)).subscribe(e => {
      if (this.selectedList && this.selectedList.title) {
        this.addTask(this.selectedList);
      }
    });
  }
  
  changeBoard(b: Board) {
    this.board = b;
    this.loading = true;
    console.log('loading list');
    this.loadLists();
  }
  
  private loadLists() {
    const b = this.board;
    const fc = this.factory;
    this.taskService.getLists(b.id)
      .pipe(runInZone(this.zone))
      .subscribe(lists => {
        if (b && b.title === 'Test') {
          this.lists = [fc.createList('Todo', 1), fc.createList('In progress', 1)];
          this.lists[1].id = 2;
          this.lists[0].id = 1;
          this.lists[0].$tasks = [fc.createTask('Task 1', 'content 1', 1), fc.createTask('Task 2', 'content 2', 2)];
          this.lists[1].$tasks = [];
          for (let i = 0; i < 20; i++) {
            const task = fc.createTask('Task ' + (i + 3), 'content ' + (i + 3), 2);
            task.$labels = this.randomLabel();
            this.lists[1].$tasks.push(task);
          }
        } else {
          this.lists = lists.sort((a, b1) => a.position - b1.position);
          this.lists.forEach(l => l.$tasks.sort((a, b1) => a.position - b1.position));
        }
        
        this.selectedList = this.lists && this.lists[0];
        this.loading = false;
        console.log('loaded list ', this.lists);
      });
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
        la.push(this.factory.createLabel('Trivial', this.board.id, '#23123'));
      } else {
        la.push(this.factory.createLabel('Inner', this.board.id, this.randomColor()));
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
  
  addTask(list: TaskList) {
    const dialogRef = this.dialog.open(CreateTaskDialogComponent, {
      maxWidth: '95vw',
      minWidth: '30vw',
      width: '1100px',
      data: list,
      
    });
    
    dialogRef.afterClosed().subscribe(task => {
      this.loadLists();
    });
  }
  
  addList() {
    const dialogRef = this.dialog.open(CreateListDialogComponent, {
      width: '450px',
    });
    
    dialogRef.afterClosed()
      .pipe(
        take(1),
        tap(() => this.loading = true),
        mergeMap(name => {
          if (!name) {
            return throwError('Name cannot be empty');
          }
          
          const l = this.factory.createList(name, this.board.id, this.lists ? this.lists.length : 0);
          return this.taskService.saveList(l);
        }),
        mergeMap(res => {
          return this.taskService.getLists(this.board.id);
        }),
        runInZone(this.zone),
      )
      .subscribe(lists => {
        this.lists = lists.sort((a, b1) => a.position - b1.position);
        this.selectedList = this.lists[this.lists.length - 1];
        this.loading = false;
        this.msg.success('List created');
      }, error1 => {
        this.loading = false;
      });
  }
  
  selectTask(task: Task) {
    console.log('Change task', task);
    this.visibleTask = task;
  }
  
  ngOnDestroy(): void {
    this.activeState.next();
    this.activeState.complete();
  }
  
  onTaskSaved(task: Task) {
  
  }
  
  drop(event: CdkDragDrop<Task[]>) {
    const tasks = event.container.data;
    const list = this.findList(tasks);
    if (event.previousContainer === event.container) {
      moveItemInArray(tasks, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(event.previousContainer.data,
        tasks,
        event.previousIndex,
        event.currentIndex);
      const listPrev = this.findList(event.previousContainer.data);
      this.updatePositions(event.previousContainer.data, listPrev.id);
    }
    this.updatePositions(tasks, list.id);
  }
  
  private updatePositions(list: Task[], listId: number) {
    for (let i = 0; i < list.length; i++) {
      list[i].position = i;
      list[i].list_id = listId;
    }
    
    this.taskService.updatePosition(list).subscribe();
  }
  
  private findList(tasks: Task[]): TaskList {
    return this.lists.find(l => l.$tasks === tasks);
  }
}

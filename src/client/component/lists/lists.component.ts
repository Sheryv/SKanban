import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { State } from '../../service/state';
import { Board } from '../../model/board';
import { TaskList } from '../../model/task-list';
import { Task } from '../../model/task';
import { Factory } from '../../service/factory';
import { SettingsService } from '../../service/settings.service';
import { Label } from '../../model/label';
import { UiSettings } from '../../model/settings';
import { KeyCommandsService } from '../../service/key-commands.service';
import { filter, mergeMap, take, takeUntil, tap } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { TaskService } from '../../service/task.service';
import { MatDialog } from '@angular/material/dialog';
import { runInZone } from '../../util/client-utils';
import { CreateTaskDialogComponent } from '../dialog/create-task-dialog/create-task-dialog.component';
import { MessageService } from '../../service/message.service';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { DialogParams, SingleInputDialogComponent } from '../dialog/single-input-dialog/single-input-dialog.component';
import { HistoryType } from '../../model/history-type';

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
    this.keyService.moveToTopEvent.emitter.pipe(takeUntil(this.activeState)).subscribe(e => {
      if (this.visibleTask) {
        this.moveTaskToTop(this.visibleTask);
      }
    });
    this.keyService.moveToBottomEvent.emitter.pipe(takeUntil(this.activeState)).subscribe(e => {
      if (this.visibleTask) {
        this.moveTaskToBottom(this.visibleTask);
      }
    });
  }
  
  changeBoard(b: Board) {
    this.board = b;
    this.loading = true;
    console.log('loading list');
    this.loadLists().subscribe();
  }
  
  private loadLists() {
    const b = this.board;
    const fc = this.factory;
    return this.taskService.getLists(b.id).pipe(
      runInZone(this.zone),
      take(1),
      tap(lists => {
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
      }));
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
      this.loadLists().subscribe();
    });
  }
  
  addList() {
    const dialogRef = this.dialog.open<SingleInputDialogComponent, DialogParams>(SingleInputDialogComponent, {
      width: '450px',
      data: {title: 'Create list'},
    });
    
    dialogRef.afterClosed()
      .pipe(
        take(1),
        filter(name => name),
        tap(() => this.loading = true),
        mergeMap(name => {
          const l = this.factory.createList(name, this.board.id, this.lists ? this.lists.length : 0);
          return this.taskService.saveList(l);
        }),
        mergeMap(res => this.loadLists()),
        runInZone(this.zone),
      )
      .subscribe(lists => {
        this.selectedList = this.lists[this.lists.length - 1];
        this.msg.success('List created');
      }, error1 => {
        this.loading = false;
        this.msg.error('Cannot create ' + error1);
      }, () => {
        this.loading = false;
      });
  }
  
  deleteList(list: TaskList) {
    list.deleted = Date.now();
    this.taskService.saveList(list).pipe(runInZone(this.zone), mergeMap(res => this.loadLists())).subscribe(() => {
      this.msg.successShort('List deleted');
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
  
  moveTaskToTop(task: Task) {
    const list = this.lists.find(l => l.id === task.list_id);
    if (list.$tasks.length > 1) {
      moveItemInArray(list.$tasks, task.position, 0);
      this.updatePositions(list.$tasks, list.id);
    }
  }
  
  moveTaskToBottom(task: Task) {
    const list = this.lists.find(l => l.id === task.list_id);
    if (list.$tasks.length > 1) {
      moveItemInArray(list.$tasks, task.position, list.$tasks.length - 1);
      this.updatePositions(list.$tasks, list.id);
    }
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
      if (list[i].$prevList == null && list[i].list_id !== listId) {
        list[i].$prevList = list[i].list_id;
      }
      list[i].list_id = listId;
    }
    
    this.taskService.updatePosition(list).subscribe();
  }
  
  private findList(tasks: Task[]): TaskList {
    return this.lists.find(l => l.$tasks === tasks);
  }
  
  moveList(l: TaskList, index: number) {
    moveItemInArray(this.lists, l.position, index);
    for (let i = 0; i < this.lists.length; i++) {
      this.lists[i].position = i;
    }
    this.taskService.updateListPosition(this.lists).subscribe();
  }
  
  renameList(list: TaskList) {
    const dialogRef = this.dialog.open<SingleInputDialogComponent, DialogParams>(SingleInputDialogComponent, {
      width: '450px',
      data: {title: 'Rename list', value: list.title},
    });
    
    dialogRef.afterClosed()
      .pipe(
        take(1),
        filter(name => name),
        tap(() => this.loading = true),
        mergeMap(name => {
          list.title = name;
          return this.taskService.saveList(list);
        }),
        mergeMap(res => this.loadLists()),
        runInZone(this.zone),
      )
      .subscribe(lists => {
        this.msg.successShort('Rename success');
      }, error1 => {
        this.loading = false;
        this.msg.error('Cannot rename ' + error1);
      }, () => {
        this.loading = false;
      });
  }
  
  deleteTask(task: Task) {
    task.deleted = Date.now();
    this.taskService.saveTask(task).pipe(
      runInZone(this.zone),
      mergeMap(res => this.taskService.addHistoryEntry(task, HistoryType.DELETE)),
      mergeMap(res => this.loadLists()),
    ).subscribe(() => {
      this.msg.successShort('Task deleted');
      this.visibleTask = null;
    });
    
  }
}

import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { State } from '../../service/state';
import { Board } from '../../../shared/model/entity/board';
import { TaskList } from '../../../shared/model/entity/task-list';
import { Task } from '../../../shared/model/entity/task';
import { Factory } from '../../../shared/./support/factory';
import { ListTasksVisibilityConfig, Settings, SettingsService } from '../../service/settings.service';
import { KeyCommandsService } from '../../service/key-commands.service';
import { filter, map, mergeMap, switchMap, take, takeUntil, takeWhile, tap } from 'rxjs/operators';
import { combineLatest, forkJoin, Observable, of, Subject } from 'rxjs';
import { TaskService } from '../../service/task.service';
import { MatDialog } from '@angular/material/dialog';
import { runInZone } from '../../util/client-utils';
import { CreateTaskDialogComponent } from '../dialog/create-task-dialog/create-task-dialog.component';
import { MessageService } from '../../service/message.service';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { DialogParams, SingleInputDialogComponent } from '../dialog/single-input-dialog/single-input-dialog.component';
import { TaskType } from '../../../shared/model/entity/task-type';
import { DateTime } from 'luxon';
import { SortDirection } from '../../../shared/model/entity/sort-direction';
import { TaskSortField } from '../../../shared/model/entity/task-sort-field';
import { NODE_CTX } from '../../global';
import { Label } from '../../../shared/model/entity/label';
import { ElectronService } from '../../service/electron.service';
import { Ipcs } from '../../../shared/model/ipcs';
import { Utils } from '../../../shared/util/utils';

@Component({
  selector: 'app-lists',
  templateUrl: './lists.component.html',
  styleUrls: ['./lists.component.scss'],
})
export class ListsComponent implements OnInit, OnDestroy {
  now = Date.now();
  board: Board;
  lists: TaskList[];
  visibleTask: Task;
  selectedList: TaskList;
  activeState = new Subject<any>();
  loading: boolean;
  types = TaskType;
  restrictedMode = false;
  ui: {
    listWidth: number;
    itemFontSize: number;
    itemPadding: number;
    itemLabelTextVisibility: boolean;
    itemContentVisibleLines: number;
    itemDueDateVisibility: boolean;
    detailsWith: number;
  };
  private searchTerm = '';


  constructor(private state: State,
              private factory: Factory,
              public settingsService: SettingsService,
              private keyService: KeyCommandsService,
              private taskService: TaskService,
              private msg: MessageService,
              private dialog: MatDialog,
              private zone: NgZone,
              private electron: ElectronService,
  ) {
    settingsService.changed.subscribe(s => {
      this.updateSettings(s);
    });
    this.updateSettings(settingsService.settingsDef);
    state.boardChanged.subscribe((b) => this.changeBoard(b));
    this.changeBoard(state.currentBoard);
    state.taskChanged.subscribe(task => {
      this.lists.forEach(l => {
        const found = l.$tasks?.find(t => t.id === task.id);
        if (found) {
          Object.assign(found, task);
        }
      });
      // if (this.lists.some(l => l.$tasks?.some(t => t.id === task.id) ?? false)) {
      //   this.changeBoard(state.currentBoard);
      // }
    });
  }

  ngOnInit(): void {
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

    this.state.search.subscribe(c => {
      this.restrictedMode = c.enabled;
      if (c.enabled) {
        this.searchTerm = c.term;
      } else {
        this.searchTerm = '';
      }
    });

    this.electron.streamEvents(Ipcs.EVENT).subscribe(event => {
      console.log('refresh list from main', event);
      if (event.op === 'refreshBoard') {


        if (this.state.currentBoard.id === event.boardId) {
          this.loadLists().subscribe(() => {
              // if (this.visibleTask) {
              //   const prev = this.visibleTask;
              //   this.visibleTask = null;
              //   this.visibleTask = prev;
              // }
            },
          );
        }
      }
    });
  }

  changeBoard(b: Board) {
    const old = this.board;
    this.board = b;
    this.loading = true;
    if (NODE_CTX.isDevEnvironment) {
      console.log('loading list');
    }
    if (old?.id !== b.id) {
      this.loadLists().pipe(
        switchMap(() => this.electron.send(Ipcs.JOB, {op: 'disableAllSync'})),
        switchMap(() => forkJoin(
          this.lists
            .filter(l => l.synchronized_file != null)
            .map(l => {
              console.log(`Enabling file sync for list ${l.id} | ${l.title}`);
              return this.electron.send(Ipcs.JOB, {
                op: 'enableSync',
                listId: l.id,
              });
            }),
        ))).subscribe();
    }
  }

  private loadLists() {
    const b = this.board;
    const fc = this.factory;
    return this.taskService.getLists(b).pipe(
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

        if (this.selectedList) {
          this.selectedList = this.lists?.find(l => l.id === this.selectedList.id);
        } else {
          this.selectedList = this.lists && this.lists[0];
        }
        const prevTask = this.visibleTask;
        this.visibleTask = null;
        if (prevTask) {
          this.visibleTask = this.selectedList.$tasks.find(t => t.id === prevTask.id);
        }

        this.loading = false;
        if (NODE_CTX.isDevEnvironment) {
          console.log('loaded list ',
            this.lists,
            this.lists?.[0]?.$tasks?.map(t => ({
              n: t.title,
              d: new Date(t.create_date).toLocaleDateString(),
              c: t.content,
            })),
          );
        }
      }));
  }

  randomLabel(): Label[] {
    const la: Label[] = [];
    let num = Math.floor(Math.random() * 15) - 5;
    if (num < 0) {
      num = 0;
    }
    for (let i = 0; i < num; i++) {
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
      width: '1300px',
      minHeight: '75vh',
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
    this.taskService.saveList(list)
      .pipe(
        runInZone(this.zone),
        mergeMap(r => combineLatest((list.$tasks || []).map(t => this.deleteTaskInternal(t)))),
        mergeMap(r => this.loadLists()),
      )
      .subscribe(() => {
        this.msg.successShort('List deleted');
      });
  }

  selectTask(task: Task) {
    if (NODE_CTX.isDevEnvironment) {
      console.log('Change task', task);
    }
    this.visibleTask = task;
  }

  ngOnDestroy(): void {
    this.activeState.next(null);
    this.activeState.complete();
  }

  onTaskSaved(task: Task) {
    const list = this.lists.find(l => l.id === task.list_id);
    if (list.synchronized_file != null) {
      return this.electron.send(Ipcs.JOB, {op: 'export', listId: list.id, path: list.synchronized_file}).subscribe();
    }
  }

  moveTaskToTop(task: Task) {
    const list = this.lists.find(l => l.id === task.list_id);
    if (list.$tasks.length > 1) {
      moveItemInArray(list.$tasks, task.position, 0);
      this.updatePositions(list.$tasks, list);
    }
  }

  moveTaskToBottom(task: Task) {
    const list = this.lists.find(l => l.id === task.list_id);
    if (list.$tasks.length > 1) {
      moveItemInArray(list.$tasks, task.position, list.$tasks.length - 1);
      this.updatePositions(list.$tasks, list);
    }
  }

  startEdit() {
    this.state.editMode.next(true);
  }

  drop(event: CdkDragDrop<Task[]>) {
    if (this.restrictedMode) {
      this.msg.info('Drag&Drop is disabled when in search mode');
      return;
    }

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
      this.updatePositions(event.previousContainer.data, listPrev);
    }
    this.updatePositions(tasks, list);
  }

  private updatePositions(tasks: Task[], list: TaskList) {
    for (let i = 0; i < tasks.length; i++) {
      tasks[i].position = i;
      if (tasks[i].$prevList == null && tasks[i].list_id !== list.id) {
        tasks[i].$prevList = tasks[i].list_id;
      }
      tasks[i].list_id = list.id;
    }

    this.taskService.updatePosition(tasks).pipe(
      switchMap(() => {
        if (list.synchronized_file != null) {
          return this.electron.send(Ipcs.JOB, {op: 'export', listId: list.id, path: list.synchronized_file});
        }
        return of(true);
      }),
    ).subscribe();
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

  private deleteTaskInternal(task: Task): Observable<any> {
    task.deleted = Date.now();
    return this.taskService.saveTask(task).pipe(
      mergeMap(res => this.taskService.addHistoryEntryOptional(task)),
    );
  }

  deleteTask(task: Task) {
    this.deleteTaskInternal(task).pipe(
      runInZone(this.zone),
      mergeMap(res => this.loadLists()),
    ).subscribe(() => {
      this.msg.successShort('Task deleted');
      this.visibleTask = null;
    });

  }

  filterTasks(tasks: Task[], list: TaskList): Task[] {
    const config = this.isListAutoSorted(list);
    if (this.searchTerm) {
      const baseList = tasks.filter(t => t.title.includes(this.searchTerm) || t.content.includes(this.searchTerm));
      if (config) {
        const sort = config.get('sortBy');
        const filtered = baseList.sort((a, b) => this.sortTasks(a, b, sort, config));
        list.$filteredTasks = filtered;
        return filtered;
      }
      list.$filteredTasks = baseList;
      return baseList;
    } else {
      if (config) {
        const now = DateTime.fromMillis(Date.now());
        const past = now.minus({days: config.get('lastVisibleDays')}).toMillis();
        const sort = config.get('sortBy');
        const sorted = tasks.sort((a, b) => this.sortTasks(a, b, sort, config));
        // const first = sorted.slice(0, config.minVisible);
        if (config.get('minVisible') >= sorted.length) {
          list.$filteredTasks = sorted;
          return sorted;
        }

        const recent = sorted.filter(t => t.create_date >= past);
        if (recent.length === sorted.length) {
          list.$filteredTasks = sorted;
          return sorted;
        }

        const missing = Math.min(config.get('minVisible'), sorted.length) - recent.length;
        if (missing > 0) {
          // const left = sorted.filter(t => t.create_date < past);
          let i = 0;
          for (let j = 0; j < missing; j++) {
            while (i < sorted.length) {
              if (sorted[i].create_date < past) {
                recent.push(sorted[i]);
                i++;
                break;
              }
              i++;
            }
          }

          return sorted.filter(t => recent.some(o => o.id === t.id));
        }
        list.$filteredTasks = recent;
        return recent;
      }
      list.$filteredTasks = tasks;
      return tasks;
    }
  }

  private isListAutoSorted(list: TaskList): ReturnType<ListTasksVisibilityConfig['getValue']>[0] {
    return this.settingsService.settingsDef.ui.lists.itemVisibilityConfig.getValue().find(c => c.get('name') === list.title);
  }

  private sortTasks(
    a: Task, b: Task,
    sort: TaskSortField,
    config: ReturnType<ListTasksVisibilityConfig['getValue']>[0],
  ): number {
    if (a[sort] == null) {
      return 1;
    }
    if (b[sort] == null) {
      return -1;
    }

    if (typeof a[sort] === 'string') {
      const field1 = a[sort] as string;
      const field2 = b[sort] as string;
      return config.get('sortDir') === SortDirection.DESC ? field1.localeCompare(field2) : field2.localeCompare(field1);
    } else if (typeof a[sort] === 'number') {
      const field1 = a[sort] as number;
      const field2 = b[sort] as number;
      return config.get('sortDir') === SortDirection.DESC ? field2 - field1 : field1 - field2;
    } else {
      throw new Error('Unsupported type: ' + (typeof a[sort]));
    }
  }

  changeListWidth() {
    const listWidth = this.settingsService.settingsDef.ui.lists.listWidth;
    const dialogRef = this.dialog.open<SingleInputDialogComponent, DialogParams>(SingleInputDialogComponent, {
      width: '450px',
      data: {
        title: 'Change list width',
        label: `Width in pixels (default: ${listWidth.defaultValue})`,
        value: listWidth.getValue() + '',
        validator: (c) =>
          Object.fromEntries(
            listWidth.validate(c.value)
              .map((v, i) => ['e' + i, v]),
          ),
      },
    }).afterClosed().subscribe(r => {
      if (r) {
        listWidth.replaceValue(Number(r));
        this.settingsService.save().subscribe(() => this.updateSettings(this.settingsService.settingsDef));
      }
    });
  }

  enableFileSync(l: TaskList) {
    this.electron.send(Ipcs.SHELL, {op: 'showOpenFileDialog'})
      .pipe(
        takeWhile(p => p != null),
        switchMap(path => {
          l.synchronized_file = path;
          return this.taskService.saveList(l).pipe(map(() => path));
        }),
        switchMap(path =>
          this.electron.send(Ipcs.JOB, {
            op: 'enableSync',
            listId: l.id,
            path,
          }),
        ),
      )
      .subscribe(() => this.msg.success('Enabled synchronization'));
  }

  exportToFile(l: TaskList) {
    this.electron.send(Ipcs.SHELL, {op: 'showSaveFileDialog', defaultPath: Utils.titleToPath(l.title)})
      .pipe(
        filter(p => p != null),
        switchMap(p =>
          this.electron.send(Ipcs.JOB, {op: 'export', listId: l.id, path: p}),
        ),
      )
      .subscribe(() => this.msg.success('Exported'));
  }

  disableFileSync(l: TaskList) {
    l.synchronized_file = null;

    this.taskService.saveList(l)
      .pipe(
        switchMap(() =>
          this.electron.send(Ipcs.JOB, {
            op: 'disableSync',
            listId: l.id,
          }),
        ),
      )
      .subscribe(b => b && this.msg.success('Disabled synchronization'));
  }

  private updateSettings(s: Settings) {
    this.ui = {
      listWidth: s.ui.lists.listWidth.getValue(),
      itemFontSize: s.ui.lists.itemFontSize.getValue(),
      itemPadding: s.ui.lists.itemPadding.getValue(),
      itemLabelTextVisibility: s.ui.lists.itemLabelTextVisibility.getValue(),
      itemContentVisibleLines: s.ui.lists.itemContentVisibleLines.getValue(),
      itemDueDateVisibility: s.ui.lists.itemDueDateVisibility.getValue(),
      detailsWith: s.ui.lists.detailsWith.getValue(),
    };
  }
}

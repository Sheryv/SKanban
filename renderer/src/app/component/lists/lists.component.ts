import { Component, HostListener, NgZone, OnDestroy, OnInit } from '@angular/core';
import { State } from '../../service/state';
import { Board } from '../../../shared/model/entity/board';
import { TaskList } from '../../../shared/model/entity/task-list';
import { Task } from '../../../shared/model/entity/task';
import { Factory } from '../../../shared/support/factory';
import { ListTasksVisibilityConfig, Settings, SettingsService } from '../../service/settings.service';
import { ACTIONS } from '../../service/key-commands.service';
import { filter, map, mergeMap, pairwise, startWith, switchMap, take, takeWhile, tap } from 'rxjs/operators';
import { forkJoin, Subject } from 'rxjs';
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
import { ElectronService } from '../../service/electron.service';
import { Ipcs } from '../../../shared/model/ipcs';
import { Utils } from '../../../shared/util/utils';
import { ListService } from '../../service/list.service';
import { TASK_PRIORITY_ATTR } from '../../../shared/model/entity/task-priority';
import { TASK_STATE_ATTR } from '../../../shared/model/entity/task-state';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  BatchAction,
  BatchActionDialogComponent,
  BatchActionDialogParams,
} from '../dialog/batch-action-dialog/batch-action-dialog.component';


@Component({
  selector: 'app-lists',
  templateUrl: './lists.component.html',
  styleUrls: ['./lists.component.scss'],
})
export class ListsComponent implements OnInit, OnDestroy {
  now = Date.now();
  lists: TaskList[];
  highlightedList: TaskList;
  selectedTasks: Task[] = [];
  activeState = new Subject<any>();
  loading: boolean;
  types = TaskType;
  ui: {
    listWidth: number;
    itemFontSize: number;
    itemPadding: number;
    itemLabelTextVisibility: boolean;
    itemContentVisibleLines: number;
    itemDueDateVisibility: boolean;
    detailsWith: number;
    stateVisible: boolean;
    priorityVisible: boolean;
  };

  keyCommands = ACTIONS;
  priorityAttrs = TASK_PRIORITY_ATTR;
  stateAttrs = TASK_STATE_ATTR;

  dragEnabled = true;

  private searchTerm = '';
  advancedSearchForm: FormGroup;

  constructor(public state: State,
              private factory: Factory,
              public settingsService: SettingsService,
              public taskService: TaskService,
              public listService: ListService,
              private msg: MessageService,
              private dialog: MatDialog,
              private fb: FormBuilder,
              private zone: NgZone,
              private electron: ElectronService,
  ) {
    settingsService.changed.subscribe(s => {
      this.updateSettings(s);
    });
    this.updateSettings(settingsService.settingsDef);
    state.selectedBoard.pipe(startWith(null), pairwise()).subscribe(([p, n]) => this.loadBoard(p, n));
    // this.loadBoard(state.currentBoard);
    state.taskChangeEvent.subscribe(task => {
      this.lists.forEach(l => {
        const found = l.$tasks?.find(t => t.id === task.id);
        if (found) {
          Object.assign(found, task);

          if (found.deleted != null) {
            l.$tasks.splice(l.$tasks.findIndex(t => t.id === task.id), 1);
            if (this.state.selectedTask.value && this.state.selectedTask.value.id === found.id) {
              this.state.selectedTask.next(null);
            }
          }

        }
      });


      // if (this.lists.some(l => l.$tasks?.some(t => t.id === task.id) ?? false)) {
      //   this.changeBoard(state.currentBoard);
      // }
    });
  }

  ngOnInit(): void {
    this.advancedSearchForm = this.fb.group({
      phrase: ['', Validators.required],
      state: [''],
      priority: [''],
    });
    ACTIONS.addTask.onTrigger(e => {
      if (this.highlightedList && this.highlightedList.title) {
        this.addTask(this.highlightedList);
      }
    }, this.activeState);
    ACTIONS.moveTaskToTop.onTrigger(e => {
      if (this.state.selectedTask.value) {
        this.taskService.moveTaskToTop(this.state.selectedTask.value, this.lists.find(l => l.id === this.state.selectedTask.value.list_id));
      }
    }, this.activeState);
    ACTIONS.moveTaskToBottom.onTrigger(e => {
      if (this.state.selectedTask.value) {
        this.taskService.moveTaskToBottom(this.state.selectedTask.value, this.lists.find(l => l.id === this.state.selectedTask.value.list_id));
      }
    }, this.activeState);
    ACTIONS.markTaskAsDone.onTrigger(e => {
      if (this.state.selectedTask.value) {
        this.markTaskAsDone(this.state.selectedTask.value);
      }
    }, this.activeState);

    this.state.listMode.subscribe(c => {
      if (c.mode === 'quicksearch' && c.arg != null) {
        this.searchTerm = c.arg;
      } else {
        this.searchTerm = '';
      }
    });

    this.electron.streamEvents(Ipcs.EVENT).subscribe(event => {
      console.log('refresh list from main', event);
      if (event.op === 'refreshBoard') {


        if (this.state.selectedBoard.value.id === event.boardId) {
          this.loadLists().subscribe(() => {
              // if (this.state.selectedTask.value) {
              //   const prev = this.state.selectedTask.value;
              //   this.state.selectedTask.value = null;
              //   this.state.selectedTask.value = prev;
              // }
            },
          );
        }
      }
    });
  }

  loadBoard(prev: Board, next: Board) {
    this.loading = true;
    if (NODE_CTX.isDevEnvironment) {
      console.log('loading list');
    }
    if (prev?.id !== next.id) {
      this.loadLists().pipe(
        switchMap(() => this.electron.send(Ipcs.JOB, { op: 'disableAllSync' })),
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
    this.selectedTasks = [];
    const b = this.state.selectedBoard.value;
    return this.taskService.getListsWithTasks(b).pipe(
      take(1),
      tap(lists => {
        this.lists = lists.sort((a, b1) => a.position - b1.position);
        this.lists.forEach(l => l.$tasks.sort((a, b1) => a.position - b1.position));

        if (this.highlightedList) {
          this.highlightedList = this.lists?.find(l => l.id === this.highlightedList.id);
        } else {
          this.highlightedList = this.lists && this.lists[0];
        }
        const prevTask = this.state.selectedTask.value;
        this.state.selectedTask.next(null);
        if (prevTask) {
          this.state.selectedTask.next(this.highlightedList.$tasks.find(t => t.id === prevTask.id));
        }

        this.loading = false;
        if (NODE_CTX.isDevEnvironment) {
          console.debug('loaded list ',
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
      data: { title: 'Create list' },
    });

    dialogRef.afterClosed()
      .pipe(
        take(1),
        filter(name => name),
        tap(() => this.loading = true),
        mergeMap(name => {
          const l = this.factory.createList(name, this.state.selectedBoard.value.id, this.lists ? this.lists.length : 0);
          return this.listService.saveList(l);
        }),
        mergeMap(res => this.loadLists()),
        runInZone(this.zone),
      )
      .subscribe(lists => {
        this.highlightedList = this.lists[this.lists.length - 1];
        this.msg.success('List created');
      }, error1 => {
        this.loading = false;
        this.msg.error('Cannot create ' + error1);
      }, () => {
        this.loading = false;
      });
  }

  deleteList(list: TaskList) {
    this.listService.deleteList(list).subscribe(() => {
      this.msg.successShort('List deleted');
    });
  }

  deleteTask(task: Task) {
    this.taskService.deleteTasks([task]).subscribe(() => {
      // const list = this.lists.find(l => l.id === task.list_id);
      // list.$tasks.splice(list.$tasks.findIndex(t => t.id === task.id), 1);
      this.msg.successShort('Task deleted');
      this.state.selectedTask.next(null);
    });
  }


  selectTask(task: Task) {
    if (NODE_CTX.isDevEnvironment) {
      console.log('Change task', task);
    }
    this.state.selectedTask.next(task);
  }

  ngOnDestroy(): void {
    this.activeState.next(null);
    this.activeState.complete();
  }

  onTaskSaved(task: Task) {
    const list = this.lists.find(l => l.id === task.list_id);
    if (list.synchronized_file != null) {
      return this.electron.send(Ipcs.JOB, { op: 'export', listId: list.id, path: list.synchronized_file }).subscribe();
    }
  }

  startEdit() {
    this.state.taskEditModeEnabled.next(true);
  }

  drop(event: CdkDragDrop<Task[]>) {
    if (this.state.listMode.value.mode !== 'normal') {
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
      this.taskService.updatePosition(listPrev.id, event.previousContainer.data).subscribe();
    }
    this.taskService.updatePosition(list.id, tasks).subscribe();
  }

  private findList(tasks: Task[]): TaskList {
    return this.lists.find(l => l.$tasks === tasks);
  }

  renameList(list: TaskList) {
    const dialogRef = this.dialog.open<SingleInputDialogComponent, DialogParams>(SingleInputDialogComponent, {
      width: '450px',
      data: { title: 'Rename list', value: list.title },
    });

    dialogRef.afterClosed()
      .pipe(
        take(1),
        filter(name => name),
        tap(() => this.loading = true),
        mergeMap(name => {
          list.title = name;
          return this.listService.saveList(list);
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


  filterTasks(tasks: Task[], list: TaskList): Task[] {
    const config = this.isListAutoSorted(list);
    if (this.state.listMode.value.mode === 'quicksearch' || this.state.listMode.value.mode === 'advanced') {
      let baseList: Task[];
      if (this.state.listMode.value.mode === 'advanced') {
        baseList = tasks.filter(t =>
          (this.advancedSearchForm.value.phrase === ''
            || t.title.includes(this.advancedSearchForm.value.phrase) || t.content.includes(this.advancedSearchForm.value.phrase)
          )
          && (this.advancedSearchForm.value.state?.length === 0 || this.advancedSearchForm.value.state.includes(t.state))
          && (this.advancedSearchForm.value.priority?.length === 0 || this.advancedSearchForm.value.priority.includes(t.priority)),
        );
      } else {
        baseList = tasks.filter(t => t.title.includes(this.searchTerm) || t.content.includes(this.searchTerm));
      }

      if (config) {
        const sort = config.get('sortBy');
        const filtered = baseList.sort((a, b) => this.sortTasks(a, b, sort, config));
        list.$filteredTasks = filtered;
        list.$customFilter = true;
        return filtered;
      }
      list.$filteredTasks = baseList;
      list.$customFilter = true;
      return baseList;
      // } else if (this.state.listMode.value.mode === 'advanced') {
      //   const baseList = tasks.filter(t => t.title.includes(this.searchTerm) || t.content.includes(this.searchTerm));
      //   if (config) {
      //     const sort = config.get('sortBy');
      //     const filtered = baseList.sort((a, b) => this.sortTasks(a, b, sort, config));
      //     list.$filteredTasks = filtered;
      //     list.$customFilter = true;
      //     return filtered;
      //   }
      //   list.$filteredTasks = baseList;
      //   list.$customFilter = true;
      //   return baseList;
    } else {
      if (config && !this.state.taskFiltersDisabled) {
        const now = DateTime.fromMillis(Date.now());
        const past = now.minus({ days: config.get('lastVisibleDays') }).toMillis();
        const sort = config.get('sortBy');
        const sorted = tasks.sort((a, b) => this.sortTasks(a, b, sort, config));
        // const first = sorted.slice(0, config.minVisible);
        if (config.get('minVisible') >= sorted.length) {
          list.$filteredTasks = sorted;
          list.$customFilter = true;
          return sorted;
        }

        const recent = sorted.filter(t => t.create_date >= past);
        if (recent.length === sorted.length) {
          list.$filteredTasks = sorted;
          list.$customFilter = true;
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

          list.$customFilter = true;
          return sorted.filter(t => recent.some(o => o.id === t.id));
        }
        list.$filteredTasks = recent;
        list.$customFilter = true;
        return recent;
      }
      list.$filteredTasks = tasks;
      list.$customFilter = false;
      return tasks;
    }
  }

  isListAutoSorted(list: TaskList): ReturnType<ListTasksVisibilityConfig['getValue']>[0] {
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
    this.electron.send(Ipcs.SHELL, { op: 'showOpenFileDialog' })
      .pipe(
        takeWhile(p => p != null),
        switchMap(path => {
          l.synchronized_file = path;
          return this.listService.saveList(l).pipe(map(() => path));
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
    this.electron.send(Ipcs.SHELL, { op: 'showSaveFileDialog', defaultPath: Utils.titleToPath(l.title) })
      .pipe(
        filter(p => p != null),
        switchMap(p =>
          this.electron.send(Ipcs.JOB, { op: 'export', listId: l.id, path: p }),
        ),
      )
      .subscribe(() => this.msg.success('Exported'));
  }

  disableFileSync(l: TaskList) {
    l.synchronized_file = null;

    this.listService.saveList(l)
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

  markListForDoneTasks(l: TaskList) {
    this.state.selectedBoard.value.done_tasks_list_id = l.id;
    this.listService.saveBoard(this.state.selectedBoard.value);
  }

  markTaskAsDone(task: Task) {
    this.taskService.markTasksAsDone([task], this.lists)
      .subscribe(() => this.msg.successShort('\'Mark done\' completed'));
  }

  itemSelectionChange() {
    this.selectedTasks = this.lists.flatMap(l => l.$tasks).filter(t => t.$selected);
  }

  selectAllForList(l: TaskList) {
    (l.$filteredTasks ?? l.$tasks).forEach(t => t.$selected = true);
    this.itemSelectionChange();
  }

  selectNoneForList(l: TaskList) {
    l.$tasks.forEach(t => t.$selected = false);
    this.itemSelectionChange();
  }

  runBatchAction(batch: BatchAction) {
    this.dialog.open<BatchActionDialogComponent, BatchActionDialogParams>(BatchActionDialogComponent, {
      width: '850px',
      data: {
        action: batch,
        tasks: this.selectedTasks,
        lists: this.lists,
      },
    }).afterClosed().subscribe(r => {
    });
  }

  @HostListener('window:keydown.control', ['$event'])
  handleControlDown(event: KeyboardEvent) {
    this.dragEnabled = false;
  }

  @HostListener('window:keyup.control', ['$event'])
  handleControlUp(event: KeyboardEvent) {
    this.dragEnabled = true;
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
      stateVisible: s.ui.lists.itemStateVisibility.getValue(),
      priorityVisible: s.ui.lists.itemPriorityVisibility.getValue(),
    };
  }
}

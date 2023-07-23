/* eslint-disable no-underscore-dangle */
import { Board } from '../../shared/model/entity/board';
import { concat, forkJoin, Observable, of } from 'rxjs';
import { DbExecResult } from '../../shared/model/db';
import { TaskList } from '../../shared/model/entity/task-list';
import { DatabaseService } from './database.service';
import { map, mergeMap, switchMap, take, toArray } from 'rxjs/operators';
import { ElectronService } from './electron.service';
import { Ipcs } from '../../shared/model/ipcs';
import { moveItemInArray } from '@angular/cdk/drag-drop';
import { DateTime } from 'luxon';
import { Injectable, Injector } from '@angular/core';
import { TaskService } from './task.service';

@Injectable({
  providedIn: 'root',
})
export class ListService {

  private _taskService: TaskService;
  private get taskService(): TaskService {
    if (!this._taskService) {
      this._taskService = this.injector.get(TaskService);
    }
    return this._taskService;
  };

  constructor(private db: DatabaseService,
              private electron: ElectronService,
              private injector: Injector,
  ) {
  }

  getList(id: number): Observable<TaskList> {
    return this.db.find({ table: 'lists', findId: id }).pipe(
      map(s => s as TaskList),
      switchMap(s => this.taskService.getTasksForList(s.id).pipe(
        map(t => {
          s.$tasks = t;
          return s;
        })),
      ),
    );
  }

  getLists(board: number): Observable<TaskList[]> {
    return this.db.findAll({
      table: 'lists',
      clauses: { board_id: board, deleted: DatabaseService.NULL },
    }).pipe(map(s => s as TaskList[]));
  }

  saveBoard(b: Board): Observable<DbExecResult> {
    return this.db.save({ table: 'boards', row: b });
  }

  saveList(b: TaskList): Observable<DbExecResult> {
    return this.db.save({ table: 'lists', row: b });
  }

  getBoards(): Observable<Board[]> {
    return this.db.findAll({ table: 'boards', clauses: { deleted: DatabaseService.NULL } })
      .pipe(
        take(1),
        map(r => r as Board[]),
      );
  }

  moveList(l: TaskList, index: number, allLists: TaskList[] = null) {
    (allLists ? of(allLists) : this.getLists(l.board_id))
      .pipe(
        switchMap(lists => {
          moveItemInArray(lists, l.position, index);
          for (let i = 0; i < lists.length; i++) {
            lists[i].position = i;
          }
          return this.updateListPosition(lists);
        }),
      )
      .subscribe();
  }

  updateListPosition(lists: TaskList[]): Observable<DbExecResult[]> {
    return concat(lists
      .map(t => this.db.exec({
        table: 'tasks',
        sql: 'update lists set position = ? where id = ?',
        params: [t.position, t.id],
      })))
      .pipe(
        mergeMap(v => v),
        take(lists.length),
        toArray(),
        take(1),
      );
  }


  disableAllFileSync(): Observable<any> {
    return this.db.findAll({ table: 'lists', clauses: { deleted: DatabaseService.NULL } }).pipe(
      map(r => r as TaskList[]),
      switchMap(lists => forkJoin(lists.filter(l => l.synchronized_file).map(l => {
        l.synchronized_file = DatabaseService.NULL;
        return this.saveList(l);
      }))),
      switchMap(() => this.electron.send(Ipcs.JOB, { op: 'disableAllSync' })),
    );
  }

  deleteList(list: TaskList): Observable<DbExecResult[]> {
    list.deleted = DateTime.now().toMillis();
    return this.saveList(list)
      .pipe(
        switchMap(r => this.taskService.deleteTasks(list.$tasks || [])),
        map(r => r.exec),
      );
  }
}

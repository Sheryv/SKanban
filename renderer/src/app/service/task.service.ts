import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { map, mergeMap, switchMap, take, tap, toArray } from 'rxjs/operators';
import { concat, forkJoin, Observable, of, zip } from 'rxjs';
import { Board } from '../../shared/model/entity/board';
import { TaskList } from '../../shared/model/entity/task-list';
import { Task } from '../../shared/model/entity/task';
import { Factory } from '../../shared/support/factory';
import { TaskHistory } from '../../shared/model/entity/task-history';
import { DbExecResult } from '../../shared/model/db';
import { Label } from '../../shared/model/entity/label';
import { Utils } from '../../shared/util/utils';
import { ElectronService } from './electron.service';
import { Ipcs } from '../../shared/model/ipcs';
import { TaskSupport } from '../../shared/support/task.support';
import { State } from './state';

@Injectable({
  providedIn: 'root',
})
export class TaskService {

  constructor(private db: DatabaseService,
              private fc: Factory,
              private electron: ElectronService,
              private taskHistorySupport: TaskSupport,
              private state: State) {
  }

  getBoards(): Observable<Board[]> {
    return this.db.findAll({table: 'boards', clauses: {deleted: DatabaseService.IS_NULL}})
      .pipe(
        take(1),
        map(r => r as Board[]),
      );
  }

  getLists(board: Board): Observable<TaskList[]> {
    return this.db.findAll({table: 'lists', clauses: {board_id: board.id, deleted: DatabaseService.IS_NULL}})
      .pipe(
        take(1),
        mergeMap((ls: TaskList[]) => {
          const obs = ls.map(l => this.getTasks(l.id));
          return zip(of(ls), ...obs);
        }),
        map((z: any[]) => {
          const ls: TaskList[] = z[0];
          for (let i = 0; i < z.length - 1; i++) {
            ls[i].$tasks = z[i + 1];
          }
          return ls;
        }),
        tap(ls => board.$lists = ls),
      );
  }

  getTasks(listId: number): Observable<Task[]> {
    return this.db.findAll({table: 'tasks', clauses: {list_id: listId, deleted: DatabaseService.IS_NULL}})
      .pipe(
        mergeMap((ls: Task[]) => {
          if (ls.length > 0) {
            const query = this.db.query({
              table: 'labels', findId: null,
              sql: `select l.*, t.task_id
                    from labels l
                           join task_labels t on l.id = t.label_id
                    where t.deleted_date is null
                      and t.task_id in (${ls.map(t => '?').join(',')})`, params: [...ls.map(t => t.id)],
            });
            return zip(of(ls), query);
          }
          return zip(of(ls), of([]));
        }),
        map((z: any[]) => {
          const task: Task[] = z[0];
          if (task.length > 0) {
            const labels = Utils.groupBy<Label, number>(z[1], (l) => l['task_id']);
            task.forEach(t => t.$labels = labels.get(t.id));
          }
          return task;
        }),
      );
  }

  saveBoard(b: Board): Observable<DbExecResult> {
    return this.db.save({table: 'boards', row: b});
  }

  saveList(b: TaskList): Observable<DbExecResult> {
    return this.db.save({table: 'lists', row: b});
  }

  saveTask(b: Task): Observable<DbExecResult> {
    this.state.taskChanged.next(b);
    return this.db.save({table: 'tasks', row: b});
  }

  updatePosition(tasks: Task[]): Observable<DbExecResult[]> {
    return concat(tasks.map(t => {
      const prevList = t.$prevList;
      const list = t.list_id;
      const ob = prevList ? this.addHistoryEntryOptional({...t, list_id: prevList}) : of(true);
      t.$prevList = null;

      this.state.taskChanged.next(t);

      return zip(this.db.exec({
        table: 'tasks',
        sql: 'update tasks set position = ?, list_id = ? where id = ?',
        params: [t.position, list, t.id],
      }), ob);
    })).pipe(
      mergeMap(v => v),
      map(v => v[0]),
      take(tasks.length),
      toArray(),
      take(1),
    );
  }

  updateListPosition(lists: TaskList[]): Observable<DbExecResult[]> {
    return concat(lists.map(t => {
      return this.db.exec({
        table: 'tasks',
        sql: 'update lists set position = ? where id = ?',
        params: [t.position, t.id],
      });
    })).pipe(
      mergeMap(v => v),
      take(lists.length),
      toArray(),
      take(1),
    );
  }

  addHistoryEntryOptional(task: Task, prev: Task | null = null): Observable<DbExecResult> {
    if (this.taskHistorySupport.doTaskChanged(prev, task)) {
      const h = this.fc.createHistoryEntrySerialize(task);
      return this.db.save({table: 'task_history', row: h});
    }
    return of(null);
  }


  getHistory(taskId: number): Observable<TaskHistory[]> {
    return this.db.findAll({
      table: 'task_history',
      clauses: {task_id: taskId},
    }).pipe(map(r => (r as TaskHistory[]).map(h => {
      h.$task = JSON.parse(h.json);
      return h;
    })));
  }

  disableAllFileSync(): Observable<any> {
    return this.db.findAll({table: 'lists'}).pipe(
      map(r => r as TaskList[]),
      switchMap(lists => {
        return forkJoin(lists.map(l => {
          l.synchronized_file = null;
          return this.saveList(l);
        }));
      }),
      switchMap(() => this.electron.send(Ipcs.JOB, {op: 'disableAllSync'})),
    );
  }
}

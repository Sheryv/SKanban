import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { map, mergeMap, take, tap, toArray } from 'rxjs/operators';
import { concat, Observable, of, zip } from 'rxjs';
import { DbExecResult } from '../../shared/model/db-exec-result';
import { Board } from '../model/board';
import { TaskList } from '../model/task-list';
import { Task } from '../model/task';
import { ClientUtils } from '../util/client-utils';
import { Label } from '../model/label';
import { HistoryType } from '../model/history-type';
import { Factory } from './factory';
import { TaskHistory } from '../model/task-history';

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  
  constructor(private db: DatabaseService, private fc: Factory) {
  }
  
  getBoards(): Observable<Board[]> {
    return this.db.findAll({table: 'boards', clauses: {deleted: DatabaseService.IS_NULL}})
      .pipe(
        take(1),
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
              sql: `select l.*, t.task_id from labels l join task_labels t on l.id = t.label_id where t.deleted_date is null and t.task_id in (${ls.map(t => '?').join(',')})`, params: [...ls.map(t => t.id)],
            });
            return zip(of(ls), query);
          }
          return zip(of(ls), of([]));
        }),
        map((z: any[]) => {
          const task: Task[] = z[0];
          if (task.length > 0) {
            const labels = ClientUtils.groupBy<Label, number>(z[1], (l) => l['task_id']);
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
    return this.db.save({table: 'tasks', row: b});
  }
  
  updatePosition(tasks: Task[]): Observable<DbExecResult[]> {
    return concat(tasks.map(t => {
      const prevList = t.$prevList;
      const list = t.list_id;
      const ob = prevList ? this.addHistoryEntry(t, HistoryType.LIST_CHANGE) : of(true);
      t.$prevList = null;
      
      return zip(this.db.exec({table: 'tasks', sql: 'update tasks set position = ?, list_id = ? where id = ?', params: [t.position, list, t.id]}), ob);
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
      return this.db.exec({table: 'tasks', sql: 'update lists set position = ? where id = ?', params: [t.position, t.id]});
    })).pipe(
      mergeMap(v => v),
      take(lists.length),
      toArray(),
      take(1),
    );
  }
  
  addHistoryEntry(task: Task, type: HistoryType): Observable<DbExecResult> {
    const h = this.createHistoryEntry(type, task);
    return this.db.save({table: 'task_history', row: h});
  }
  
  private createHistoryEntry(type: HistoryType, task: Task): TaskHistory {
    let h: TaskHistory = null;
    switch (type) {
      case HistoryType.LIST_CHANGE:
        h = this.fc.createHistoryEntry(type, task.id, null, null, task.id, null, null, null, task.list_id.toString(), task.$prevList.toString());
        break;
      case HistoryType.CONTENT_MODIFY:
        h = this.fc.createHistoryEntry(type, task.id, null, task.content, task.id);
        break;
      case HistoryType.TITLE_MODIFY:
        h = this.fc.createHistoryEntry(type, task.id, task.title, null, task.id);
        break;
      case HistoryType.DUE_DATE_MODIFY:
        h = this.fc.createHistoryEntry(type, task.id, null, null, task.id, null, task.due_date);
        break;
      case HistoryType.DELETE:
        h = this.fc.createHistoryEntry(type, task.id, null, null, task.id);
        break;
      case HistoryType.STATE_MODIFY:
        h = this.fc.createHistoryEntry(type, task.id, null, null, task.id, task.state);
        break;
      case HistoryType.TYPE_MODIFY:
        h = this.fc.createHistoryEntry(type, task.id, null, null, task.id, null, null, task.type);
        break;
    }
    
    return h;
  }
  
  getHistory(taskId: number): Observable<TaskHistory[]> {
    return this.db.findAll({table: 'task_history', clauses: {task_id: taskId}});
  }

//
  // getValue(key: string): Observable<string> {
  //   return this.get(key).pipe(map(r => r && r.value));
  // }
  //
  // set(key: string, value: any): Observable<DbExecResult> {
  //   if (value == null) {
  //     return;
  //   }
  //   return this.get(key).pipe(
  //     mergeMap(v => {
  //       if (v != null) {
  //         return this.db.save({table: 'properties', findId: null, row: {id: v.id}});
  //       } else {
  //         return this.db.exec({table: 'properties', findId: null, sql: 'insert into properties (key, value) values (?,?)', params: [key, value]});
  //       }
  //     }),
  //   );
  // }
}

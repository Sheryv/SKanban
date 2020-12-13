import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { map, mergeMap, take } from 'rxjs/operators';
import { Observable, of, zip } from 'rxjs';
import { DbExecResult } from '../../shared/model/db-exec-result';
import { Board } from '../model/board';
import { TaskList } from '../model/task-list';
import { Task } from '../model/task';
import { ClientUtils } from '../util/client-utils';
import { Label } from '../model/label';

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  
  constructor(private db: DatabaseService) {
  }
  
  getBoards(): Observable<Board[]> {
    return this.db.findAll({table: 'boards', findId: null})
      .pipe(
        take(1),
      );
  }
  
  getLists(boardId: number): Observable<TaskList[]> {
    return this.db.query({table: 'lists', findId: null, sql: `select * from lists where board_id = ?`, params: [boardId]})
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
      );
  }
  
  getTasks(listId: number): Observable<Task[]> {
    return this.db.query({table: null, findId: null, sql: `select * from tasks where list_id = ?`, params: [listId]})
      .pipe(
        mergeMap((ls: Task[]) => {
          const query = this.db.query({
            table: 'labels', findId: null,
            sql: `select l.*, t.task_id from labels l join task_labels t on l.id = t.label_id where t.task_id in (${ls.map(t => '?').join(',')})`, params: [...ls.map(t => t.id)],
          });
          
          return zip(of(ls), query);
        }),
        map((z: any[]) => {
          const task: Task[] = z[0];
          const labels = ClientUtils.groupBy<Label, number>(z[1], (l) => l['task_id']);
          task.forEach(t => t.$labels = labels.get(t.id));
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

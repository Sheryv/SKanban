import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { map, mergeMap, take, tap, toArray, zip } from 'rxjs/operators';
import { concat, Observable, of } from 'rxjs';
import { DbExecResult } from '../../shared/model/db-exec-result';
import { Task } from '../model/task';
import { Label } from '../model/label';
import { Factory } from './factory';
import { TaskLabel } from '../model/task-label';
import { HistoryType } from '../model/history-type';

@Injectable({
  providedIn: 'root',
})
export class LabelService {
  
  constructor(private db: DatabaseService, private fc: Factory) {
  }
  
  private labels: Map<number, Label[]> = new Map<number, Label[]>();
  
  getLabels(boardId: number): Observable<Label[]> {
    if (this.labels && this.labels.get(boardId)) {
      return of(this.labels.get(boardId));
    }
    
    return this.db.findAll({table: 'labels', clauses: {board_id: boardId}})
      .pipe(
        tap(l => this.labels.set(boardId, l)),
        take(1),
      );
  }
  
  clearCache() {
    this.labels = null;
  }
  
  createLabel(name: string, boardId: number, color: string = null): Observable<DbExecResult> {
    const label = this.fc.createLabel(name, boardId, color);
    return this.db.save({table: 'labels', row: label});
  }
  
  setLabelsForTask(task: Task, labels: Label[]): Observable<DbExecResult[]> {
    let lb = labels.slice();
    console.log('lb to set ', lb);
    return this.db.findAll({table: 'task_labels', clauses: {deleted_date: DatabaseService.IS_NULL, task_id: task.id}})
      .pipe(
        map((all: TaskLabel[]) => {
          console.log('current lb ', all.slice());
          return all.filter(a => {
            const res = lb.every(n => n.id !== a.label_id);
            if (!res) {
              lb.splice(lb.findIndex(n => n.id === a.label_id), 1);
            }
            return res;
          }).map(n => {
            n.deleted_date = Date.now();
            return n;
          });
        }),
        tap((d) => console.log('lb delete', d)),
        mergeMap(d => {
          let ob: Observable<TaskLabel[]>;
          if (d.length > 0) {
            const h = this.fc.createHistoryEntry(HistoryType.LABEL_REMOVE, task.id, null, null, task.id, null, null, null, d.map(l => l.label_id).join(','));
            ob = this.db.save({table: 'task_history', row: h}).pipe(map(() => d));
          } else {
            ob = of(d);
          }
          return ob;
        }),
        mergeMap(d => concat(d.map(l => this.db.save({table: 'task_labels', row: l}))).pipe(
          mergeMap(v => v),
          toArray(),
        )),
        take(1),
        tap(() => console.log('lb save', lb)),
        mergeMap(() => {
          if (lb.length <= 0) {
            return of(null);
          }
          const h = this.fc.createHistoryEntry(HistoryType.LABEL_ADD, task.id, null, null, task.id, null, null, lb.map(l => l.id).join(','));
          return this.db.save({table: 'task_history', row: h});
        }),
        mergeMap(() => concat(lb.map(l => {
            const connection = this.fc.createLabelConnection(l.id, task.id);
            return this.db.save({table: 'task_labels', row: connection});
          })).pipe(
          mergeMap(v => v),
          take(lb.length),
          toArray(),
          take(1),
          ),
        ),
      );
  }
  
}

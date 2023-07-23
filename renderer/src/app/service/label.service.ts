import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { map, mergeMap, switchMap, take, tap, toArray } from 'rxjs/operators';
import { concat, Observable, of } from 'rxjs';
import { Task } from '../../shared/model/entity/task';
import { Factory } from '../../shared/./support/factory';
import { TaskLabel } from '../../shared/model/entity/task-label';
import { DbExecResult } from '../../shared/model/db';
import { NODE_CTX } from '../global';
import { Label } from '../../shared/model/entity/label';
import { DateTime } from 'luxon';

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

    return this.db.findAll({ table: 'labels', clauses: { board_id: boardId } })
      .pipe(
        map(r => r as Label[]),
        tap(l => this.labels.set(boardId, l)),
        take(1),
      );
  }

  clearCache() {
    this.labels.clear();
  }

  createLabel(name: string, boardId: number, color: string = null): Observable<DbExecResult> {
    const label = this.fc.createLabel(name, boardId, color);
    return this.db.save({ table: 'labels', row: label }).pipe(tap(() => this.clearCache()));
  }

  setLabelsForTask(task: Task, labels: Label[]): Observable<DbExecResult[]> {
    const lb = labels.slice();
    return this.db.findAll({ table: 'task_labels', clauses: { deleted_date: DatabaseService.NULL, task_id: task.id } })
      .pipe(
        map((all: TaskLabel[]) => {
          return all.filter(a => {
            const res = lb.every(n => n.id !== a.label_id);
            if (!res) {
              lb.splice(lb.findIndex(n => n.id === a.label_id), 1);
            }
            return res;
          }).map(n => {
            n.deleted_date = DateTime.now().toMillis();
            return n;
          });
        }),
        tap((d) => {
          if (NODE_CTX.isDevEnvironment) {
            console.log('lb delete', d);
          }
        }),
        // mergeMap(d => {
        //   let ob: Observable<TaskLabel[]>;
        //   if (d.length > 0) {
        //     const h = this.fc.createHistoryEntry(HistoryType.LABEL_REMOVE, task.id, null, null, task.id, null, null, null, null, d.map(l => l.label_id).join(','));
        //     ob = this.db.save({table: 'task_history', row: h}).pipe(map(() => d));
        //   } else {
        //     ob = of(d);
        //   }
        //   return ob;
        // }),
        mergeMap(d => concat(d.map(l => this.db.save({ table: 'task_labels', row: l }))).pipe(
          mergeMap(v => v),
          toArray(),
        )),
        take(1),
        tap(() => {
          if (NODE_CTX.isDevEnvironment) {
            console.log('lb save', lb);
          }
        }),
        mergeMap(() => {
          if (lb.length <= 0) {
            return of(null);
          }
          task.$labels = lb;
          // const h = this.fc.createHistoryEntry(HistoryType.LABEL_ADD, task.id, null, null, task.id, null, null, null, null, lb.map(l => l.id).join(','));
          return this.db.save({ table: 'task_history', row: this.fc.createHistoryEntrySerialize(task) });
        }),
        mergeMap(() => concat(lb.map(l => this.addLabelToTask(l.id, task))).pipe(
            mergeMap(v => v),
            take(lb.length),
            toArray(),
            take(1),
          ),
        ),
      );
  }

  addLabelToTask(labelId: number, task: Task): Observable<DbExecResult | null> {
    return this.db.findAll({
      table: 'task_labels',
      clauses: { task_id: task.id, label_id: labelId },
    }).pipe(switchMap(existing => {
      let connection: TaskLabel;
      if (existing.length > 0) {
        connection = existing[0] as TaskLabel;
        if (connection.deleted_date == null) {
          return of(null);
        }

        connection.deleted_date = null;
      } else {
        connection = this.fc.createLabelConnection(labelId, task.id);
      }
      return this.db.save({ table: 'task_labels', row: connection });
    }));
  }

  removeLabelFromTask(labelId: number, task: Task): Observable<DbExecResult | null> {
    return this.db.findAll({
      table: 'task_labels',
      clauses: { deleted_date: DatabaseService.NULL, task_id: task.id, label_id: labelId },
    }).pipe(switchMap(existing => {
      if (existing.length > 0) {
        const lb = existing[0] as TaskLabel;
        lb.deleted_date = DateTime.now().toMillis();
        return this.db.save({ table: 'task_labels', row: lb });
      }

      return of(null);
    }));
  }
}

import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { concatMap, map, mergeMap, take, toArray } from 'rxjs/operators';
import { concat, forkJoin, Observable, of, zip } from 'rxjs';
import { DbExecResult } from '../../shared/model/db-exec-result';
import { Board } from '../model/board';
import { TaskList } from '../model/task-list';
import { Task } from '../model/task';
import { Label } from '../model/label';
import { Factory } from './factory';
import { fromIterable } from 'rxjs/internal-compatibility';

@Injectable({
  providedIn: 'root',
})
export class LabelService {
  
  constructor(private db: DatabaseService, private fc: Factory) {
  }
  
  getLabels(): Observable<Label[]> {
    return this.db.findAll({table: 'labels', findId: null})
      .pipe(
        take(1),
      );
  }
  
  addLabelsTask(task: Task, labels: Label[]): Observable<DbExecResult[]> {
    return concat(labels.map(l => {
      const connection = this.fc.createLabelConnection(l.id, task.id);
      return this.db.save({table: 'task_labels', findId: null, row: connection});
    })).pipe(
      mergeMap(v => v),
      take(labels.length),
      toArray(),
      take(1),
    );
  }
  
}

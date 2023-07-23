import { Entity } from './entity/entity';
import { Task } from './entity/task';
import { forkJoin, Observable, OperatorFunction } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

export type Row = { [key: string]: any } | Entity;

export interface DbExecResult {
  /**
   * Row id of the inserted row.
   *
   * Only contains valid information when the query was a successfully
   * completed INSERT statement.
   */
  lastID?: number;
  /**
   * Number of rows changed.
   *
   * Only contains valid information when the query was a
   * successfully completed UPDATE or DELETE statement.
   */
  changes?: number;
}


export interface DbResult {
  exec?: DbExecResult;
  rows?: Row[];
}


export class TaskExecResults {
  constructor(
    public readonly tasks: Task[],
    public exec: DbExecResult[],
  ) {
  }

  static transform(func: (task: Task, prev: DbExecResult) => Observable<DbExecResult>): OperatorFunction<TaskExecResults, TaskExecResults> {
    return switchMap((res: TaskExecResults) => res.transformEach(func));
  }

  static transformAtOnce(func: (results: TaskExecResults) => Observable<DbExecResult[]>):
    OperatorFunction<TaskExecResults, TaskExecResults> {

    return switchMap((res: TaskExecResults) => func(res).pipe(map(nr => res.withResults(nr))));
  }

  withResults(results: DbExecResult[]) {
    this.exec = results;
    return this;
  }

  transformEach(func: (task: Task, prev: DbExecResult) => Observable<DbExecResult>): Observable<TaskExecResults> {
    return forkJoin(this.tasks.map((t, i) => func(t, this.exec[i]))).pipe(map(nr => this.withResults(nr)));
  }

  combine(results: TaskExecResults): TaskExecResults {
    return new TaskExecResults([...this.tasks, ...results.tasks], [...this.exec, ...results.exec]);
  }
}


export interface DbOperation {
  type?: 'save' | 'find' | 'findAll' | 'query' | 'exec';

  table: string;
  findId?: number;
  row?: Row;
  sql?: string;
  clauses?: { [key: string]: any };
  params?: any[];
}


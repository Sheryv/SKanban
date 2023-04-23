import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ElectronService } from './electron.service';
import { DbExecResult, DbOperation, DbResult, Row } from '../../shared/model/db';

@Injectable({
  providedIn: 'root',
})
export class DatabaseService {

  constructor(private electron: ElectronService) {
  }

  public static readonly IS_NULL = '\0is null';
  public static readonly IS_NOT_NULL = '\0is not null';

  save(operation: DbOperation): Observable<DbExecResult> {
    operation.type = 'save';
    return this.electron.sendDb(operation).pipe(map(r => r.exec));
  }

  find(operation: DbOperation): Observable<Row> {
    operation.type = 'find';
    return this.electron.sendDb(operation).pipe(map(r => r.rows && r.rows[0]));
  }

  findAll(operation: DbOperation): Observable<Row[]> {
    operation.type = 'findAll';
    return this.electron.sendDb(operation).pipe(map(r => r.rows));
  }

  query(operation: DbOperation): Observable<Row[]> {
    operation.type = 'query';
    return this.electron.sendDb(operation).pipe(map(r => r.rows));
  }

  exec(operation: DbOperation): Observable<DbExecResult> {
    operation.type = 'exec';
    return this.electron.sendDb(operation).pipe(map(r => r.exec));
  }

  run(operation: DbOperation): Observable<DbResult> {
    if (!operation.type) {
      throw Error('\'operation.type\' cannot be null');
    }
    return this.electron.sendDb(operation);
  }
}

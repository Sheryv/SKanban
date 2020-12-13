import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { DbOperation } from '../../shared/model/db-operation';
import { DbExecResult } from '../../shared/model/db-exec-result';
import { Bridge } from '../../shared/service/bridge';
import { Row } from '../../typings';

@Injectable({
    providedIn: 'root'
})
export class DatabaseService {
  
  save(operation: DbOperation): Observable<DbExecResult> {
    return Bridge.clientSend('dbp', 'save', operation).pipe(take(1), map(r => r[0]));
  }
  
  find(operation: DbOperation): Observable<Row> {
    return Bridge.clientSend('dbp', 'find', operation).pipe(take(1), map(r => r[0]));
  }
  
  findAll(operation: DbOperation): Observable<Row[]> {
    return Bridge.clientSend('dbp', 'findAll', operation).pipe(take(1));
  }
  
  query(operation: DbOperation): Observable<Row[]> {
    return Bridge.clientSend('dbp', 'query', operation).pipe(take(1));
  }
  
  exec(operation: DbOperation): Observable<DbExecResult> {
    return Bridge.clientSend('dbp', 'exec', operation).pipe(take(1), map(r => r[0]));
  }
}

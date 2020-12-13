import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { map, mergeMap, take } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { DbExecResult } from '../../shared/model/db-exec-result';
import { Row } from '../../typings';

@Injectable({
    providedIn: 'root'
})
export class PropertiesService {
  
  constructor(private db: DatabaseService) {
  }
  
  get(key: string): Observable<Row> {
    return this.db.query({table: 'properties', findId: null, sql: 'select value from properties where key = ?', params: [key]})
      .pipe(
        take(1),
        map(r => r && r[0]),
      );
  }
  
  getValue(key: string): Observable<string> {
    return this.get(key).pipe(map(r => r && r.value));
  }
  
  set(key: string, value: any): Observable<DbExecResult> {
    if (value == null) {
      return;
    }
    return this.get(key).pipe(
      mergeMap(v => {
        if (v != null) {
          return this.db.save({table: 'properties', findId: null, row: {id: v.id}});
        } else {
          return this.db.exec({table: 'properties', findId: null, sql: 'insert into properties (key, value) values (?,?)', params: [key, value]});
        }
      }),
    );
  }
}

import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { map, mergeMap, take } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { NODE_CTX } from '../global';
import { DbExecResult } from '../../shared/model/db';
import { Property } from '../../shared/model/entity/property';

@Injectable({
  providedIn: 'root',
})
export class PropertiesService {

  constructor(private db: DatabaseService) {
  }

  get(key: string): Observable<Property> {
    return this.db.findAll({ table: 'properties', clauses: { key } })
      .pipe(
        take(1),
        map(r => r && r[0] as Property),
      );
  }

  getAllWithPrefix(prefix: string): Observable<Property[]> {
    return this.db.query({
      table: 'properties',
      sql: `select *
            from properties
            where key like ?`,
      params: [prefix + '%'],
    })
      .pipe(
        take(1),
        map(r => r as Property[]),
      );
  }

  getValue(key: string): Observable<string> {
    return this.get(key).pipe(map(r => r && r['value']));
  }

  set(key: string, value: any): Observable<DbExecResult> {
    // if (value == null) {
    //   return of(null);
    // }
    return this.get(key).pipe(
      mergeMap(v => {
        const row = { key: key, value, id: null };
        if (v != null) {
          row.id = v.id;
        }
        if (NODE_CTX.isDevEnvironment) {
          console.log('get-set prop', row);
        }
        return this.db.save({ table: 'properties', findId: null, row: row });
      }),
    );
  }
}

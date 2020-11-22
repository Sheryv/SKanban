import * as sqlite3 from 'sqlite3';
import { Database, ISqlite, open } from 'sqlite';
import { from, Observable } from 'rxjs';
import { DbOperation } from '../../shared/model/db-operation';
import { DbExecResult } from '../../shared/model/db-exec-result';
import { Row } from '../../typings';
import { notNullField } from '../../shared/util/utils';
import { tap } from 'rxjs/operators';


export class DatabaseProvider {
  private db: Database;
  
  init() {
    open({
      filename: './database.db',
      driver: sqlite3.Database,
    }).then((db) => {
      console.log('db opened');
      this.db = db;
      this.db.on('trace', (t) => {
        console.debug(':::DB::: ', t);
      });
      this.db.exec('CREATE TABLE IF NOT EXISTS boards (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, ' +
        'title TEXT NOT NULL, ' +
        'create_date INTEGER NOT NULL, ' +
        'type_label_id INTEGER, ' +
        'deleted INTEGER ' +
        'FOREIGN KEY(type_label_id) REFERENCES labels(id)' +
        ')');
      this.db.exec('CREATE TABLE IF NOT EXISTS lists (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, ' +
        'title TEXT NOT NULL, ' +
        'create_date INTEGER NOT NULL, ' +
        'position INTEGER NOT NULL,' +
        'bg_color TEXT,' +
        'deleted INTEGER, ' +
        'board_id INTEGER NOT NULL, ' +
        'FOREIGN KEY(board_id) REFERENCES boards(id)' +
        ')');
      this.db.exec('CREATE TABLE IF NOT EXISTS labels (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, ' +
        'title TEXT NOT NULL, ' +
        'create_date INTEGER NOT NULL, ' +
        'bg_color TEXT' +
        ')');
      
      this.db.exec('CREATE TABLE IF NOT EXISTS tasks (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, ' +
        'title TEXT NOT NULL, ' +
        'content TEXT, ' +
        'modify_date INTEGER NOT NULL, ' +
        'create_date INTEGER NOT NULL,' +
        'bg_color TEXT,' +
        'position INTEGER NOT NULL,' +
        'deleted INTEGER, ' +
        'list_id INTEGER, ' +
        'FOREIGN KEY(list_id) REFERENCES lists(id)' +
        ')');
      this.db.exec('CREATE TABLE IF NOT EXISTS task_history (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, ' +
        'title TEXT ' +
        'content TEXT, ' +
        'related_object NUMBER, ' +
        'type NUMBER NOT NULL, ' +
        'modify_date INTEGER NOT NULL, ' +
        'task_id INTEGER NOT NULL, ' +
        'FOREIGN KEY(task_id) REFERENCES tasks(id)' +
        ')');
      this.db.exec('CREATE TABLE IF NOT EXISTS task_labels (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, ' +
        'create_date INTEGER NOT NULL, ' +
        'label_id INTEGER NOT NULL, ' +
        'task_id INTEGER NOT NULL, ' +
        'FOREIGN KEY(label_id) REFERENCES labels(id),' +
        'FOREIGN KEY(task_id) REFERENCES tasks(id)' +
        ')');
      this.db.exec('CREATE TABLE IF NOT EXISTS properties (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, ' +
        'key TEXT NOT NULL UNIQUE, ' +
        'value TEXT NOT NULL ' +
        ')');
    });
  }
  
  save(op: DbOperation): Observable<DbExecResult> {
    return from(this.db.get(`select id from ${op.table} where id=?`, op.row.id).then(r => {
      let p: Promise<ISqlite.RunResult<any>>;
      if (r) {
        p = this.buildUpdate(op);
      } else {
        p = this.buildInsert(op);
      }
      p.then(res => console.log('DB: Saved: ', JSON.stringify(op), ' | ', res),
        e => console.error('DB: Error executing sql: ', JSON.stringify(op), ' | ', e));
      return p;
    }));
  }
  
  findAll(op: DbOperation): Observable<Row[]> {
    return from(this.db.all<Row[]>(
        `select *
      from ${op.table}`));
  }
  
  findById(op: DbOperation): Observable<Row | null> {
    notNullField(op.findId, 'DbOperation.findId');
    
    return from(this.db.get<Row | null>(`select * from ${op.table} where id=?`, op.findId));
  }
  
  exec(op: DbOperation): Observable<DbExecResult> {
    notNullField(op.sql, 'DbOperation.sql');
    notNullField(op.params, 'DbOperation.params');
    
    return from(this.db.run(op.sql, ...op.params));
  }
  
  query(op: DbOperation): Observable<Row[]> {
    notNullField(op.sql, 'DbOperation.sql');
    notNullField(op.params, 'DbOperation.params');
    
    return from(this.db.all(op.sql, ...op.params)).pipe(tap(d => {
      console.log('query: ', JSON.stringify(d), JSON.stringify(op));
    }));
  }
  
  private buildUpdate(op: DbOperation) {
    const keys = Object.keys(op.row).filter(k => !k.startsWith('$') && (typeof op.row[k] === 'number' || typeof op.row[k] === 'string'));
    
    return this.db.run(`update ${op.table} set (${keys.map(k => k + '=?').join(', ')})`,
      ...keys.map(k => op.row[k]));
  }
  
  private buildInsert(op: DbOperation) {
    const keys = Object.keys(op.row).filter(k => k !== 'id' && !k.startsWith('$') && (typeof op.row[k] === 'number' || typeof op.row[k] === 'string'));
    
    return this.db.run(`insert into ${op.table} (${keys.join(', ')}) values (${keys.map(k => '?').join(',')})`,
      ...keys.map(k => op.row[k]));
  }
}

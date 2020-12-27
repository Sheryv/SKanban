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
  private readonly version = 1;
  
  init() {
    open({
      filename: './database.db',
      driver: sqlite3.Database,
    }).then((db) => {
      const handler = err => console.error('>>>> Error in DB init <<<<<:', err);
      
      console.log('db opened');
      this.db = db;
      this.db.on('trace', (t) => {
        console.debug(':::DB::: ', t);
      });
      this.db.exec('CREATE TABLE IF NOT EXISTS boards (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, ' +
        'title TEXT NOT NULL, ' +
        'create_date INTEGER NOT NULL, ' +
        'type_label_id INTEGER, ' +
        'deleted INTEGER' +
        ')').catch(handler);
      
      this.db.exec('CREATE TABLE IF NOT EXISTS labels (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, ' +
        'title TEXT NOT NULL, ' +
        'create_date INTEGER NOT NULL, ' +
        'bg_color TEXT, ' +
        'board_id INTEGER NOT NULL, ' +
        'FOREIGN KEY(board_id) REFERENCES boards(id)' +
        ')').catch(handler);
      
      this.db.exec('CREATE TABLE IF NOT EXISTS lists (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, ' +
        'title TEXT NOT NULL, ' +
        'create_date INTEGER NOT NULL, ' +
        'position INTEGER NOT NULL,' +
        'bg_color TEXT,' +
        'deleted INTEGER, ' +
        'board_id INTEGER NOT NULL, ' +
        'FOREIGN KEY(board_id) REFERENCES boards(id)' +
        ')').catch(handler);
      
      this.db.exec('CREATE TABLE IF NOT EXISTS tasks (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, ' +
        'title TEXT NOT NULL, ' +
        'content TEXT, ' +
        'modify_date INTEGER NOT NULL, ' +
        'create_date INTEGER NOT NULL, ' +
        'state INTEGER NOT NULL, ' +
        'due_date INTEGER, ' +
        'bg_color TEXT, ' +
        'position INTEGER NOT NULL,' +
        'deleted INTEGER, ' +
        'list_id INTEGER NOT NULL, ' +
        'FOREIGN KEY(list_id) REFERENCES lists(id)' +
        ')').catch(handler);
      
      this.db.exec('CREATE TABLE IF NOT EXISTS task_history (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, ' +
        'title TEXT, ' +
        'content TEXT, ' +
        'related_object NUMBER, ' +
        'type NUMBER NOT NULL, ' +
        'state NUMBER, ' +
        'due_date INTEGER, ' +
        'history_date INTEGER NOT NULL, ' +
        'task_id INTEGER NOT NULL, ' +
        'FOREIGN KEY(task_id) REFERENCES tasks(id)' +
        ')').catch(handler);
      
      this.db.exec('CREATE TABLE IF NOT EXISTS task_labels (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, ' +
        'create_date INTEGER NOT NULL, ' +
        'label_id INTEGER NOT NULL, ' +
        'task_id INTEGER NOT NULL, ' +
        'deleted_date INTEGER, ' +
        'FOREIGN KEY(label_id) REFERENCES labels(id),' +
        'FOREIGN KEY(task_id) REFERENCES tasks(id)' +
        ')').catch(handler);
      
      this.db.exec('CREATE TABLE IF NOT EXISTS properties (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, ' +
        'key TEXT NOT NULL UNIQUE, ' +
        'value TEXT NOT NULL ' +
        ')').catch(handler);
      
      this.db.get('select value from properties where key = ?', 'db_version').then(v => {
        if (v == null) {
          this.db.run('insert into properties (key, value) values (?, ?)', 'db_version', this.version.toString()).catch(handler);
        }
      }).catch(handler);
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
    const cl = this.transformClauses(op.clauses, ' where ');
    
    const sql = `select *
    from ${op.table}${cl.where}`;
     console.log('findAll: ', JSON.stringify(op), 'SQL: ' + sql, '\n');
    return from(this.db.all<Row[]>(sql, ...cl.params));
  }
  
  findById(op: DbOperation): Observable<Row | null> {
    notNullField(op.findId, 'DbOperation.findId');
    const cl = this.transformClauses(op.clauses, ' and ');
    
    return from(this.db.get<Row | null>(`select * from ${op.table} where id=?${cl.where}`, op.findId, ...cl.params));
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
    const keys = Object.keys(op.row).filter(k => k !== 'id' && !k.startsWith('$') && (typeof op.row[k] === 'number' || typeof op.row[k] === 'string'));
    
    const sql = `update ${op.table} set ${keys.map(k => k + '=?').join(', ')} where id=?`;
    const params = keys.map(k => op.row[k]);
    params.push(op.row.id);
    console.log('update: ', sql, ' || ', JSON.stringify(params));
    return this.db.run(sql, ...params);
  }
  
  private buildInsert(op: DbOperation) {
    const keys = Object.keys(op.row).filter(k => k !== 'id' && !k.startsWith('$') && (typeof op.row[k] === 'number' || typeof op.row[k] === 'string'));
    
    const sql = `insert into ${op.table} (${keys.join(', ')}) values (${keys.map(k => '?').join(',')})`;
    const params = keys.map(k => op.row[k]);
    console.log('insert: ', sql, ' || ', JSON.stringify(params));
    return this.db.run(sql, ...params);
  }
  
  private transformClauses(clauses: { [key: string]: any }, suffix: string = ''): { where: string, params: any[] } {
    const res = {where: '', params: []};
    if (clauses && Object.keys(clauses).length > 0) {
      const keys = Object.keys(clauses);
      res.params = keys.map(k => clauses[k]).filter(v => typeof v !== 'string' || !v.startsWith('\0'));
      res.where = suffix + (keys.map(k => {
        const value = clauses[k];
        if (typeof value === 'string' && value.startsWith('\0')) {
          return k + ' ' + value.substr(1);
        }
        return k + '=?';
      }).join(' and '));
    }
    return res;
  }
}

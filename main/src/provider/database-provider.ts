import { notNullField, Utils } from '../../../renderer/src/shared/util/utils';
import { CONTEXT } from '../context';
import { DbOperation, DbResult, Row } from '../../../renderer/src/shared/model/db';
// import { Database } from 'better-sqlite3';
//     const Database = require('better-sqlite3');
// import Database from 'better-sqlite3';
import * as sqlite3 from 'sqlite3';
import { Database, open } from 'sqlite';
import { existsSync } from 'fs';
import { TaskList } from '../../../renderer/src/shared/model/entity/task-list';

export class DatabaseProvider {
  private db: Database;
  private readonly version = 3;
  private handler = err => console.error('>>>> Error in DB init <<<<<:', err);

  public static readonly IS_NULL = '\0is null';
  public static readonly IS_NOT_NULL = '\0is not null';

  private static readonly DB_LOG_TAG = ':::DB::: ';
  private static readonly LOG_REQUESTS = false;

  async init() {
    process.on('exit', () => this.db.close());
    // this.db = new Database('./' + Utils.DB_NAME);

    // this.db = new Database('./' + Utils.DB_NAME);
    this.db = await open({
      filename: './' + Utils.DB_NAME,
      driver: sqlite3.Database,
    });
    if (CONTEXT.isDevEnvironment) {
      this.db.on('trace', (t) => {
        const normalizeRegexp = new RegExp(/\s+/g);
        console.debug(DatabaseProvider.DB_LOG_TAG, t.toString().replaceAll(normalizeRegexp, ' '));
      });
    }


    await this.db.run('CREATE TABLE IF NOT EXISTS boards (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, ' +
      'title TEXT NOT NULL, ' +
      'create_date INTEGER NOT NULL, ' +
      'type_label_id INTEGER, ' +
      'deleted INTEGER' +
      ')');

    await this.db.run('CREATE TABLE IF NOT EXISTS labels (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, ' +
      'title TEXT NOT NULL, ' +
      'create_date INTEGER NOT NULL, ' +
      'bg_color TEXT, ' +
      'board_id INTEGER NOT NULL, ' +
      'FOREIGN KEY(board_id) REFERENCES boards(id)' +
      ')');

    await this.db.run('CREATE TABLE IF NOT EXISTS lists (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, ' +
      'title TEXT NOT NULL, ' +
      'create_date INTEGER NOT NULL, ' +
      'position INTEGER NOT NULL,' +
      'bg_color TEXT,' +
      'synchronized_file TEXT,' +
      'deleted INTEGER, ' +
      'board_id INTEGER NOT NULL, ' +
      'FOREIGN KEY(board_id) REFERENCES boards(id)' +
      ')');

    await this.db.run('CREATE TABLE IF NOT EXISTS tasks (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, ' +
      'title TEXT NOT NULL, ' +
      'content TEXT, ' +
      'modify_date INTEGER NOT NULL, ' +
      'create_date INTEGER NOT NULL, ' +
      'state INTEGER NOT NULL, ' +
      'uuid TEXT NOT NULL UNIQUE, ' +
      'due_date INTEGER, ' +
      'type INTEGER NOT NULL default 0, ' +
      'priority INTEGER NOT NULL default 2, ' +
      'bg_color TEXT, ' +
      'position INTEGER NOT NULL,' +
      'handled INTEGER,' +
      'deleted INTEGER, ' +
      'list_id INTEGER NOT NULL, ' +
      'FOREIGN KEY(list_id) REFERENCES lists(id)' +
      ')');

    await this.db.run('CREATE TABLE IF NOT EXISTS task_history (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, ' +
      'json TEXT NOT NULL, ' +
      'history_date INTEGER NOT NULL, ' +
      'task_id INTEGER NOT NULL, ' +
      'FOREIGN KEY(task_id) REFERENCES tasks(id)' +
      ')');

    await this.db.run('CREATE TABLE IF NOT EXISTS task_labels (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, ' +
      'create_date INTEGER NOT NULL, ' +
      'label_id INTEGER NOT NULL, ' +
      'task_id INTEGER NOT NULL, ' +
      'deleted_date INTEGER, ' +
      'FOREIGN KEY(label_id) REFERENCES labels(id),' +
      'FOREIGN KEY(task_id) REFERENCES tasks(id)' +
      ')');

    await this.db.run('CREATE TABLE IF NOT EXISTS properties (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, ' +
      'key TEXT NOT NULL UNIQUE, ' +
      'value TEXT NOT NULL ' +
      ')');


    let versionFromDb = await this.db.get('select value from properties where key = ?', 'db_version');
    if (versionFromDb == null || versionFromDb.value == null) {
      await this.db.run('insert into properties (key, value) values (?, ?)', 'db_version', this.version.toString());
    } else {
      await this.migrateDB(Number(versionFromDb.value));
    }

    const lists = await this.db.all('select * from lists') as TaskList[]
    for (let list of lists) {
      if (list.synchronized_file && !existsSync(list.synchronized_file)) {
        await this.db.run('update lists set synchronized_file = null where id = ?', list.id)   ;
        console.log(`Removed file sync link for list ${list.id} because file does not exists at ${list.synchronized_file}`)
      }
    }
  }

  private async migrateDB(version) {
    if (version === 1) {

      await this.db.run('alter table tasks add column type INTEGER NOT NULL default 0');
      await this.db.run('alter table task_history add column task_type INTEGER');

      version++;
    }
    if (version === 2) {
      await this.db.run('alter table tasks add column uuid TEXT NOT NULL default \'-\'');
      await this.db.run('alter table tasks add column priority INTEGER NOT NULL default 2');
      await this.db.run('alter table tasks add column handled INTEGER');
      await this.db.run('alter table task_history add column priority');
      await this.db.run('alter table lists add column synchronized_file TEXT');

      await this.db.run('drop table task_history')
      await this.db.run('CREATE TABLE IF NOT EXISTS task_history (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, ' +
        'json TEXT NOT NULL, ' +
        'history_date INTEGER NOT NULL, ' +
        'task_id INTEGER NOT NULL, ' +
        'FOREIGN KEY(task_id) REFERENCES tasks(id)' +
        ')');

      version++;
    }
    await this.db.run('update properties set value = ? where key = ?', version.toString(), 'db_version');
  }

  save(op: DbOperation): Promise<DbResult> {
    return this.db.get(`select id
                        from ${op.table}
                        where id = ?`, op.row.id)
      .then(r => {
        let p: Promise<any>;
        if (r) {
          p = this.buildUpdate(op);
        } else {
          p = this.buildInsert(op);
        }
        p.then(res => {
            if (CONTEXT.isDevEnvironment && DatabaseProvider.LOG_REQUESTS) {
              console.log(DatabaseProvider.DB_LOG_TAG, 'save:  ', JSON.stringify(op), ' | ', res);
            }
          },
          e => console.error('DB: Error executing sql: ', JSON.stringify(op), ' | ', e));
        return p;
      }).then(r => ({exec: r}));
  }

  findAll(op: DbOperation): Promise<DbResult> {
    const cl = this.transformClauses(op.clauses, ' where ');

    const sql = `select *
                 from ${op.table} ${cl.where}`;
    if (CONTEXT.isDevEnvironment && DatabaseProvider.LOG_REQUESTS) {
      console.log(DatabaseProvider.DB_LOG_TAG, 'findAll: ', JSON.stringify(op), '\n');
    }
    return this.db.all<Row[]>(sql, ...cl.params).then(r => ({rows: r}));
  }

  find(op: DbOperation): Promise<DbResult> {
    notNullField(op.findId, 'DbOperation.findId');
    const cl = this.transformClauses(op.clauses, ' and ');

    return this.db.get<Row | null>(`select *
                                    from ${op.table}
                                    where id = ?${cl.where}`, op.findId, ...cl.params).then(r => ({rows: [r]}));
  }

  exec(op: DbOperation): Promise<DbResult> {
    notNullField(op.sql, 'DbOperation.sql');
    notNullField(op.params, 'DbOperation.params');

    return this.db.run(op.sql, ...op.params).then(r => ({exec: r}));
  }

  query(op: DbOperation): Promise<DbResult> {
    notNullField(op.sql, 'DbOperation.sql');
    notNullField(op.params, 'DbOperation.params');

    return this.db.all(op.sql, ...op.params).then(d => {
      if (CONTEXT.isDevEnvironment && DatabaseProvider.LOG_REQUESTS) {
        console.log(DatabaseProvider.DB_LOG_TAG, 'query: ', JSON.stringify(d), JSON.stringify(op));
      }
      return d;
    }).then(r => ({rows: r}));
  };

  private buildUpdate(op: DbOperation) {
    const keys = Object.keys(op.row).filter(k => k !== 'id' && !k.startsWith('$') && (typeof op.row[k] === 'number' || typeof op.row[k] === 'string'));

    const sql = `update ${op.table}
                 set ${keys.map(k => k + '=?').join(', ')}
                 where id = ?`;
    const params = keys.map(k => op.row[k]);
    params.push(op.row.id);
    if (CONTEXT.isDevEnvironment && DatabaseProvider.LOG_REQUESTS) {
      console.log(DatabaseProvider.DB_LOG_TAG, 'update: ', sql, ' || ', JSON.stringify(params));
    }
    return this.db.run(sql, ...params);
  }

  private buildInsert(op: DbOperation) {
    const keys = Object.keys(op.row).filter(k => k !== 'id' && !k.startsWith('$') && (typeof op.row[k] === 'number' || typeof op.row[k] === 'string'));

    const sql = `insert into ${op.table} (${keys.join(', ')})
                 values (${keys.map(k => '?').join(',')})`;
    const params = keys.map(k => op.row[k]);
    if (CONTEXT.isDevEnvironment && DatabaseProvider.LOG_REQUESTS) {
      console.log('insert: ', sql, ' || ', JSON.stringify(params));
    }
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

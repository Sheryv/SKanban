import { Subject } from 'rxjs';
import { readFile } from 'fs';
import * as path from 'path';
import { ImportedTask } from '../../../renderer/src/shared/model/imported-task';
import { DateTime } from 'luxon';
import { TaskState } from '../../../renderer/src/shared/model/entity/task-state';
import { DatabaseProvider } from './database-provider';
import { Factory } from '../../../renderer/src/shared/support/factory';
import { Task } from '../../../renderer/src/shared/model/entity/task';
import { TaskType } from '../../../renderer/src/shared/model/entity/task-type';
import { Utils } from '../../../renderer/src/shared/util/utils';
import { TASK_PRIORITY_MAPPING, TaskPriority } from '../../../renderer/src/shared/model/entity/task-priority';
import { TaskHistory } from '../../../renderer/src/shared/model/entity/task-history';
import { TaskSupport } from '../../../renderer/src/shared/support/task.support';


export class TaskFileImporter {

  private static commentRegexp = new RegExp(/<!--(.*)-->/);
  private static headerStart = new RegExp(/^#+/);
  private static blankRegexp = new RegExp(/^\s*$/);

  // \r?\n {0,3}(((#[ \t]+)|(##[ \t]+))(?<title>[ \S]+) <!--! (?<id>\w+) -->)|((?<title2>[ \S]+)\r?\n-{3,})[ \t]*
  static splitRegex() {
    return new RegExp(/\n {0,3}(((#[ \t]{4,})|(##[ \t]{4,}))\S*\w+[ \S]+)|(\w+[ \S]+\r?\n(-{5,}|={5,}))/g);
  }

  onContentChanged = new Subject<{ filename: string, content: string }>();

  constructor(private path: string,
              private db: DatabaseProvider,
              private factory: Factory = new Factory(),
              private taskSupport: TaskSupport = new TaskSupport()) {
  }

  // async import(): Promise<{ list: string, tasks: ImportedTask[] }> {
  //   return this.readFileAsync().then((text: string) => {
  //     let tasks = this.parseContent(text).map(b => this.parseTask(b.header, b.body, false));
  //     return {
  //       list: path.basename(this.path, path.extname(this.path)).replace('_', ' ').replace('-', ' '),
  //       tasks: tasks,
  //     };
  //   });
  // }

  async load(): Promise<{ list: string, tasks: ImportedTask[] }> {
    return this.readFileAsync().then((text: string) => {
      let tasks = this.parseContent(text).map(b => this.parseTask(b.header, b.body));
      return {
        list: path.basename(this.path, path.extname(this.path)).replace('_', ' ').replace('-', ' '),
        tasks: tasks,
      };
    });
  }

  async saveToDb(list: { id?: number, boardId?: number, name: string }, tasks: ImportedTask[]): Promise<Task[]> {
    const now = DateTime.now().toMillis();
    const resultTasks: Task[] = [];
    if (list.id) {

      let maxPos = await this.db.findAll({
        table: 'tasks',
        clauses: {list_id: list.id, deleted: DatabaseProvider.IS_NULL},
      }).then(r => r.rows as Task[]).then(tasks => {
        if (tasks.length > 0) {
          return tasks.sort((a, b) => a.position - b.position)[0].position;
        }
        return 0;
      });

      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];

        const current: Task | null = await this.db.findAll({
          table: 'tasks',
          clauses: {uuid: task.uuid, deleted: DatabaseProvider.IS_NULL},
        }).then(r => r.rows[0] as Task);

        if (current) {
          if (this.taskSupport.doTaskChangedSimple(task, current)) {


            const history: TaskHistory = this.factory.createHistoryEntrySerialize(current);
            // if (current.title !== task.title) {
            //   ob.push(this.factory.createHistoryEntry(HistoryType.TITLE_MODIFY, current.id, current.title, null, current.id));
            // }
            // if (current.content !== task.content) {
            //   ob.push(this.factory.createHistoryEntry(HistoryType.CONTENT_MODIFY, current.id, null, current.content, current.id));
            // }
            // if (current.state !== task.state) {
            //   ob.push(this.factory.createHistoryEntry(HistoryType.STATE_MODIFY, current.id, null, null, current.id, current.state));
            // }
            // if (current.due_date !== task.due_date?.toMillis()) {
            //   ob.push(this.factory.createHistoryEntry(HistoryType.DUE_DATE_MODIFY, current.id, null, null, current.id, null, current.due_date));
            // }
            // if (current.due_date !== task.due_date?.toMillis()) {
            //   ob.push(this.factory.createHistoryEntry(HistoryType.PRIORITY_MODIFY, current.id, null, null, current.id, null, null, null, current.priority));
            // }


            current.modify_date = now;
            current.state = task.state ?? current.state;
            current.priority = task.priority ?? current.priority;
            current.title = task.title ?? current.title;
            current.content = task.content ?? current.content;
            current.due_date = task.due_date?.toMillis() ?? current.due_date;
            resultTasks.push(current);

            await this.db.save({table: 'task_history', row: history});

            await this.db.save({table: 'tasks', row: current});

          }
        } else {
          const t: Task = {
            bg_color: null,
            create_date: now,
            deleted: null,
            modify_date: now,
            type: TaskType.STANDARD,
            title: task.title,
            content: task.content,
            priority: task.priority,
            list_id: list.id,
            position: maxPos++,
            due_date: task.due_date?.toMillis(),
            state: task.state ?? TaskState.OPEN,
            uuid: task.uuid ?? Utils.generateId(),
            handled: null,
          };
          resultTasks.push(t);

          await this.db.save({table: 'tasks', row: t});
        }
      }


    } else {
      const maxPosition = await this.db.findAll({table: 'lists', clauses: {board_id: list.boardId}})
        .then(r => Math.max(...r.rows.map(s => s.position)));

      const listId = await this.db.save({
        table: 'lists',
        row: this.factory.createList(list.name, list.boardId, maxPosition + 1, now),
      }).then(r => r.exec.lastID);

      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        let row = this.factory.createTask(task.title, task.content, listId, i, task.due_date?.toMillis());
        row.priority = task.priority;

        resultTasks.push(row);

        await this.db.save({
          table: 'tasks',
          row: row,
        });
      }

    }
    return resultTasks;
  }

  private readFileAsync() {
    return new Promise((resolve, reject) => {
      readFile(this.path, (err: NodeJS.ErrnoException | null, data: Buffer) => {
        if (err) {
          reject(err);
        } else {
          resolve(data.toString());
        }
      });
    });
  }

  private parseContent(text: string) {
    const content = '\n' + text;
    let indexes = [];
    const regExp = TaskFileImporter.splitRegex();
    let result = regExp.exec(content);

    while (result != null) {
      if (result[0].startsWith('\n')) {
        indexes.push({s: result.index + 1, e: result.index + result[0].length});
      } else {
        indexes.push({s: result.index, e: result.index + result[0].length});
      }

      result = regExp.exec(content);
    }

    let lastIndex = content.length;
    return indexes.reverse().map(i => {
      let header = content.substring(i.s, i.e);

      let body = content.substring(i.e + 1, lastIndex);

      lastIndex = i.s;
      return {body, header};
    }).reverse();
  }

  private parseTask(header: string, body: string, parseBody: boolean = true): ImportedTask {
    const fieldsRegexp = /\*?\*?(?<name>\w+)\*?\*? *: *(?<value>[:"' .\-+\w/]+),? */g;
    let name = header.replace(TaskFileImporter.commentRegexp, '').trim().replace(TaskFileImporter.headerStart, '');
    const endOfHeader = name.indexOf('\n');
    if (endOfHeader > 0) {
      name = name.substring(0, endOfHeader);
    }
    name = name.trim();

    let meta = {};
    let leftBody = body.trim();
    if (parseBody && leftBody.length > 0) {
      const endOfLine = leftBody.indexOf('\n');
      const nextLine = leftBody.indexOf('\n', endOfLine + 1);

      if (nextLine - endOfLine <= 2 && endOfLine > 0) {

        const line = leftBody.substring(0, endOfLine);

        const metaLine = TaskFileImporter.commentRegexp.exec(line)?.[1];
        meta = metaLine?.split(',')
          .filter(s => s.includes('='))
          .map(s => s.split('='))
          .filter(s => s[0].length > 0 && s[1].length > 0)
          .reduce((prev, currentValue) => ({
            ...prev,
            [currentValue[0].trim().toLowerCase()]: currentValue[1].trim(),
          }), {});

        let field = fieldsRegexp.exec(line);
        while (field != null) {

          meta[field.groups.name.toLowerCase()] = field.groups.value.trim();
          field = fieldsRegexp.exec(line);
        }

        if ((meta && Object.keys(meta).length > 0) && nextLine > 0) {
          leftBody = leftBody.substring(nextLine);
        }
        if (leftBody.startsWith('\n')) {
          leftBody = leftBody.substring(1);
        }
      }
    }

    const states = ['1', TaskState.DONE, 'done', '✔', '✅'];

    return {
      title: name,
      content: leftBody,
      create_date: this.convertDate(meta && meta['created']),
      modify_date: this.convertDate(meta && meta['modified']),
      due_date: this.convertDate(meta && meta['due']),
      uuid: meta && meta['id'] || null,
      state: states.includes(meta && meta['state']) ? TaskState.DONE : TaskState.OPEN,
      priority: meta && meta['priority'] && TASK_PRIORITY_MAPPING[meta['priority'].toLowerCase()] || TaskPriority.MAJOR,
    };
  }

  private convertDate(value: string): DateTime | null {
    if (value) {
      let date = DateTime.fromISO(value);
      if (!date.isValid) {
        date = DateTime.fromFormat(value, 'yyyy-MM-dd HH:mm');
      }
      if (!date.isValid) {
        date = DateTime.fromFormat(value, 'yyyy-MM-dd HH:mm:ss');
      }
      return date.isValid ? date : null;
    }
    return null;
  }

}

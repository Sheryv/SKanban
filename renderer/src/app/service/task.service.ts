import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { map, mergeMap, switchMap, take, tap, toArray } from 'rxjs/operators';
import { concat, forkJoin, Observable, of, zip } from 'rxjs';
import { Board } from '../../shared/model/entity/board';
import { TaskList } from '../../shared/model/entity/task-list';
import { Task } from '../../shared/model/entity/task';
import { Factory } from '../../shared/support/factory';
import { TaskHistory } from '../../shared/model/entity/task-history';
import { DbExecResult, TaskExecResults } from '../../shared/model/db';
import { Label } from '../../shared/model/entity/label';
import { Utils } from '../../shared/util/utils';
import { ElectronService } from './electron.service';
import { TaskSupport } from '../../shared/support/task.support';
import { State } from './state';
import { ListService } from './list.service';
import { moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Ipcs } from '../../shared/model/ipcs';
import { DateTime } from 'luxon';

@Injectable({
  providedIn: 'root',
})
export class TaskService {

  constructor(private db: DatabaseService,
              private fc: Factory,
              private electron: ElectronService,
              private list: ListService,
              private taskHistorySupport: TaskSupport,
              private state: State) {
  }

  getListsWithTasks(board: Board): Observable<TaskList[]> {
    return this.list.getLists(board.id)
      .pipe(
        take(1),
        mergeMap((ls: TaskList[]) => {
          const obs = ls.map(l => this.getTasksForList(l.id));
          return zip(of(ls), ...obs);
        }),
        map((z: any[]) => {
          const ls: TaskList[] = z[0];
          for (let i = 0; i < z.length - 1; i++) {
            ls[i].$tasks = z[i + 1];
          }
          return ls;
        }),
        tap(ls => board.$lists = ls),
      );
  }


  getAllTasks(): Observable<{ board: Board; list: TaskList; tasks: Task[] }[]> {
    return this.list.getBoards()
      .pipe(
        mergeMap(boards =>
          forkJoin(boards.filter(b => b && b.id).flatMap(b => this.getListsWithTasks(b).pipe(
            map(lists => ({ l: lists, b })),
          ))),
        ),
        map(all => all.flatMap(a => a.l.map(l => ({ board: a.b, list: l, tasks: l.$tasks })))),
      );
  }

  getTasksForList(listId: number): Observable<Task[]> {
    return this.db.findAll({ table: 'tasks', clauses: { list_id: listId, deleted: DatabaseService.NULL } })
      .pipe(
        mergeMap((ls: Task[]) => {
          if (ls.length > 0) {
            const query = this.db.query({
              table: 'labels', findId: null,
              sql: `select l.*, t.task_id
                    from labels l
                           join task_labels t on l.id = t.label_id
                    where t.deleted_date is null
                      and t.task_id in (${ls.map(t => '?').join(',')})`, params: [...ls.map(t => t.id)],
            });
            return zip(of(ls), query);
          }
          return zip(of(ls), of([]));
        }),
        map((z: any[]) => {
          const task: Task[] = z[0];
          if (task.length > 0) {
            const labels = Utils.groupBy<Label, number>(z[1], (l) => l['task_id']);
            task.forEach(t => t.$labels = labels.get(t.id));
          }
          return task;
        }),
      );
  }


  saveTasks(tasks: Task[]): Observable<TaskExecResults> {
    return forkJoin(tasks.map(b => this.db.save({ table: 'tasks', row: b })))
      .pipe(
        map(res => new TaskExecResults(tasks, res)),
        tap(all => all.tasks.forEach(t => this.state.taskChangeEvent.next(t))),
      );
  }

  updatePosition(listId: number, tasks: Task[], notifyUpdated: boolean = true): Observable<DbExecResult[]> {
    return concat(tasks.map((t, i) => {
      t.position = i;

      let ob: Observable<any> = of(true);
      if (t.$prevList != null || t.list_id !== listId) {
        ob = this.addHistoryEntryOptional({ ...t, list_id: t.$prevList ?? t.list_id });
      }

      t.list_id = listId;
      t.$prevList = null;

      return zip(this.db.exec({
        table: 'tasks',
        sql: 'update tasks set position = ?, list_id = ? where id = ?',
        params: [t.position, t.list_id, t.id],
      }), of(t), ob);
    })).pipe(
      mergeMap(v => v),
      tap(([_, t]) => this.state.taskChangeEvent.next(t)),
      map(v => v[0]),
      take(tasks.length),
      toArray(),
      take(1),
      switchMap(s =>
        this.list.getList(listId).pipe(
          switchMap(list => {
            if (notifyUpdated && list.synchronized_file != null) {
              return this.electron.send(Ipcs.JOB, {
                op: 'export',
                listId: list.id,
                path: list.synchronized_file,
              });
            }
            return of(true);
          }),
          map(() => s),
        )),
    );
  }

  moveToList(tasks: Task[], currentList: TaskList, targetList: TaskList): Observable<TaskExecResults> {
    for (const task of tasks) {
      const currentIndex = currentList.$tasks.findIndex(t => t.id === task.id);

      transferArrayItem(currentList.$tasks,
        targetList.$tasks,
        currentIndex,
        targetList.$tasks.length);
    }

    return this.updatePosition(currentList.id, currentList.$tasks).pipe(
      switchMap(() => this.updatePosition(targetList.id, targetList.$tasks)),
      map(r => new TaskExecResults(tasks, r)),
    );
  }


  moveAllToList(tasks: Task[], allLists: TaskList[], targetList: TaskList): Observable<TaskExecResults> {
    const obs = Array.from(Utils.groupBy(tasks, t => t.list_id).entries()).map(([listId, tasksForList]) => {
        const current = allLists.find(l => l.id === listId);
        return this.moveToList(tasksForList, current, targetList);
      },
    );

    return forkJoin(obs).pipe(map(s => s.reduce((p, c) => p.combine(c))));
  }

  moveTaskToTop(task: Task, listToUpdate: TaskList = null): Observable<DbExecResult[]> {
    return this.moveTaskToIndex(task, 0, listToUpdate);
  }

  moveTaskToBottom(task: Task, listToUpdate: TaskList = null): Observable<DbExecResult[]> {
    return (listToUpdate ? of(listToUpdate) : this.list.getList(task.list_id)).pipe(
      switchMap(list => this.moveTaskToIndex(task, list.$tasks.length - 1, list)),
    );
  }

  moveTaskToIndex(task: Task, index: number, listToUpdate: TaskList = null): Observable<DbExecResult[]> {
    return (listToUpdate ? of(listToUpdate) : this.list.getList(task.list_id)).pipe(
      switchMap(list => {
        if (list.$tasks.length > 1) {
          moveItemInArray(list.$tasks, task.position, index);
          return this.updatePosition(list.id, list.$tasks);
        }
        return of([]);
      }),
    );
  }


  addHistoryEntryOptional(task: Task, prev: Task | null = null): Observable<DbExecResult> {
    if (this.taskHistorySupport.doTaskChanged(task, prev)) {
      const h = this.fc.createHistoryEntrySerialize(prev || task);
      return this.db.save({ table: 'task_history', row: h });
    }
    return of(null);
  }


  markTasksAsDone(tasks: Task[], allLists: TaskList[]): Observable<TaskExecResults> {
    const target = allLists.find(l => l.id === this.state.selectedBoard.value.done_tasks_list_id);

    const grouped = Utils.groupBy(tasks, t => t.list_id);

    const obs = Array.from(grouped.entries()).map(([listId, tasksForList]) => {
        const current = allLists.find(l => l.id === listId);
        for (const task of tasksForList) {
          task.handled = DateTime.now().toMillis();
        }

        return this.saveTasks(tasksForList).pipe(switchMap(res => this.moveToList(res.tasks, current, target)));
      },
    );

    return forkJoin(obs).pipe(map(s => s.reduce((p, c) => p.combine(c))));
  }


  getHistory(taskId: number): Observable<TaskHistory[]> {
    return this.db.findAll({
      table: 'task_history',
      clauses: { task_id: taskId },
    }).pipe(map(r => (r as TaskHistory[]).map(h => {
      h.$task = JSON.parse(h.json);
      return h;
    })));
  }

  deleteTasks(tasks: Task[]): Observable<TaskExecResults> {
    for (const task of tasks) {
      task.deleted = DateTime.now().toMillis();
    }
    return this.saveTasks(tasks).pipe(TaskExecResults.transform(t => this.addHistoryEntryOptional(t)));
  }
}

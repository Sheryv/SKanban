import { Task } from '../../../renderer/src/shared/model/entity/task';
import { DateTime } from 'luxon';
import { TASK_PRIORITY_MAPPING } from '../../../renderer/src/shared/model/entity/task-priority';
import { writeFile } from 'fs/promises';
import { DatabaseProvider } from './database-provider';
import { Label } from '../../../renderer/src/shared/model/entity/label';
import { Utils } from '../../../renderer/src/shared/util/utils';

export class TaskFileExporter {

  constructor(private db: DatabaseProvider) {
  }

  async loadFromDb(listId: number): Promise<Task[]> {
    return this.db.findAll({
      table: 'tasks',
      clauses: {list_id: listId, type: 0, deleted: DatabaseProvider.IS_NULL},
    }).then(r => r.rows.sort((a, b) => b.position - a.position) as Task[]);
  }

  async export(filePath: string, tasks: Task[]) {

    const mapping = Object.keys(TASK_PRIORITY_MAPPING).reduce((prev, currentValue) => ({
      ...prev,
      [TASK_PRIORITY_MAPPING[currentValue]]: currentValue,
    }), {});

    const labelsAll = await this.db.query({
      table: 'labels', findId: null,
      sql: `select l.*, t.task_id from labels l join task_labels t on l.id = t.label_id where t.deleted_date is null and t.task_id in (${tasks.map(t => '?').join(',')})`,
      params: [...tasks.map(t => t.id)],
    }).then(r=>r.rows as Label[]);
    const labelsPerTask = Utils.groupBy<Label, number>(labelsAll, k => k.task_id)

    const text = tasks.map(task => {
      const due = (task.due_date > 0) ? ` **Due**: ${this.toDateString(task.due_date)},` : '';

      const labelsString = (labelsPerTask.get(task.id)?.length > 0) ? ` **Labels**: ${labelsPerTask.get(task.id).map(l => l.title).join('; ')},` : '';

      return `${task.title}
-------------------------------------------------------------------------------
**State**: ${task.state},${due}${labelsString} **Priority**: ${mapping[task.priority]} <!-- id=${task.uuid}, modified=${this.toDateString(task.modify_date)}, created=${this.toDateString(task.create_date)} -->

${task.content}
`;

    }).join('\n\n');

    await writeFile(filePath, text);
  }

  private toDateString(date: number): string {
    if (date > 0) {
      return DateTime.fromMillis(date).toFormat('yyyy-MM-dd HH:mm:ss');
    } else {
      return '';
    }
  }

}

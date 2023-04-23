import { TaskState } from './entity/task-state';
import { DateTime } from 'luxon';
import { TaskPriority } from './entity/task-priority';

export interface ImportedTask {
  uuid: string;
  title: string;
  content: string;
  modify_date: DateTime;
  create_date: DateTime;
  due_date?: DateTime;
  state: TaskState;
  priority: TaskPriority;
  // bg_color: string;
  // position: number;
  // deleted: number;
  // list_id: number;
  // type: TaskType;

  // $labels?: Label[];
  // $prevList?: number;
}

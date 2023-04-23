import { Entity } from './entity';
import { TaskType } from './task-type';
import { TaskState } from './task-state';
import { TaskPriority } from './task-priority';
import { Label } from './label';

export interface TaskHistory extends Entity {
  history_date: number;
  task_id: number;
  json: string;

  $task?: TaskHistoryContent;
  $labels?: Label[];

}

export interface TaskHistoryContent extends Entity {
  title: string;
  content: string;
  due_date: number;
  state: TaskState;
  priority: TaskPriority;
  bg_color: string;
  position: number;
  deleted: number;
  handled: number;
  list_id: number;
  type: TaskType;
  labels: number[];
}

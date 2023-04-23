import { Label } from './label';
import { TaskType } from './task-type';
import { Entity } from './entity';
import { TaskState } from './task-state';
import { TaskPriority } from './task-priority';

export interface Task extends Entity {
  title: string;
  content: string;
  modify_date: number;
  create_date: number;
  due_date: number;
  state: TaskState;
  priority: TaskPriority;
  bg_color: string;
  position: number;
  deleted: number;
  handled: number;
  list_id: number;
  type: TaskType;
  uuid: string;

  $labels?: Label[];
  $prevList?: number;
}

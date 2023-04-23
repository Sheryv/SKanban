import { Entity } from './entity';

export interface TaskLabel extends Entity {
  create_date: number;
  label_id: number;
  task_id: number;
  deleted_date?: number;
}

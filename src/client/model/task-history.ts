import { Entity } from '../../shared/model/entity';

export interface TaskHistory extends Entity {
  title: string;
  content: string;
  related_object: number;
  type: number;
  state: number;
  history_date: number;
  due_date: number;
  task_id: number;
}

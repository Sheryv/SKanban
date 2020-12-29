import { Entity } from '../../shared/model/entity';
import { HistoryType } from './history-type';

export interface TaskHistory extends Entity {
  title: string;
  content: string;
  related_object: number;
  type: HistoryType;
  state: number;
  history_date: number;
  added: string;
  removed: string;
  due_date: number;
  task_id: number;
  
  $label?: string;
}

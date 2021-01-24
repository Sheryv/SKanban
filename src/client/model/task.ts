import { Entity } from '../../shared/model/entity';
import { Label } from './label';
import { TaskType } from './task-type';

export interface Task extends Entity {
  title: string;
  content: string;
  modify_date: number;
  create_date: number;
  due_date: number;
  state: number;
  bg_color: string;
  position: number;
  deleted: number;
  list_id: number;
  type: TaskType;
  
  $labels?: Label[];
  $prevList?: number;
}

import { Entity } from '../../shared/model/entity';
import { Label } from './label';

export interface TaskLabel extends Entity {
  create_date: number;
  label_id: number;
  task_id: number;
}

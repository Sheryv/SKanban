import { Entity } from '../../shared/model/entity';
import { Label } from './label';

export interface Task extends Entity {
  title: string;
  content: string;
  modify_date: number;
  create_date: number;
  bg_color: string;
  position: number;
  deleted: number;
  list_id: number;
  
  $labels?: Label[];
}

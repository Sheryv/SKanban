import { Entity } from '../../shared/model/entity';
import { Task } from './task';

export interface TaskList extends Entity {
  title: string;
  create_date: number;
  position: number;
  bg_color: string;
  deleted: number;
  board_id: number;
  
  $tasks?: Task[];
  $filteredTasks?: Task[];
}

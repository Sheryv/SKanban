import { Entity } from './entity';
import { Task } from './task';

export interface TaskList extends Entity {
  title: string;
  create_date: number;
  position: number;
  bg_color: string;
  deleted: number;
  board_id: number;
  synchronized_file: string;

  $tasks?: Task[];
  $filteredTasks?: Task[];
}

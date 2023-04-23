import { Entity } from './entity';
import { TaskList } from './task-list';

export interface Board extends Entity {
  title: string;
  create_date: number;
  deleted: number;
  type_label_id: number;

  $lists?: TaskList[];
}

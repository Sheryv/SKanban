import { Task } from './entity/task';


export interface Reminder {
  task: Task,
  handlerId: number;
}

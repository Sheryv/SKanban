import { Task } from '../model/entity/task';
import { ImportedTask } from '../model/imported-task';

export class TaskSupport {
  doTaskChanged(task: Task, prev: Task | null = null): boolean {
    return prev == null
      || prev.title !== task.title
      || prev.content !== task.content
      || prev.state !== task.state
      || prev.due_date !== task.due_date
      || prev.type !== task.type
      || prev.list_id !== task.list_id
      || prev.priority !== task.priority
      || prev.deleted !== task.deleted
      || prev.position !== task.position
      || prev.handled !== task.handled;
  }


  doTaskChangedSimple(task: ImportedTask, prev: Task): boolean {
    return  prev.title !== task.title
      || prev.content !== task.content
      || prev.state !== task.state
      || prev.due_date !== task.due_date?.toMillis()
      || prev.priority !== task.priority
      // || prev.deleted !== task.deleted
      // || prev.position !== task.position
      // || prev.handled !== task.handled;
  }
}

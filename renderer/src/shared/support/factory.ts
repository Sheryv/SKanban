/* eslint-disable @typescript-eslint/naming-convention */
import { Board } from '../model/entity/board';
import { Task } from '../model/entity/task';
import { TaskList } from '../model/entity/task-list';
import { TaskHistory, TaskHistoryContent } from '../model/entity/task-history';
import { TaskLabel } from '../model/entity/task-label';
import { TaskType } from '../model/entity/task-type';
import { Label } from '../model/entity/label';
import { DateTime } from 'luxon';
import { Utils } from '../util/utils';
import { TaskState } from '../model/entity/task-state';
import { TaskPriority } from '../model/entity/task-priority';

export class Factory {
  static readonly COLOR_LIST = '#eee';
  static readonly COLOR_LABEL = '#1a6acc';


  createBoard(title: string,
              create_date: number = Date.now(),
              type_label_id: number = null,
              deleted: number = null,
  ): Board {
    return {title, create_date, type_label_id, deleted, done_tasks_list_id: null};
  }

  createList(title: string,
             board_id: number,
             position: number = 0,
             create_date: number = DateTime.now().toMillis(),
             bg_color: string = null,
             deleted: number = null,
  ): TaskList {
    return {title, create_date, position, bg_color, deleted, synchronized_file: null, board_id};
  }


  createTask(title: string,
             content: string,
             list_id: number = null,
             position: number = 0,
             due_date: number = null,
             type: TaskType = TaskType.STANDARD,
             state: number = TaskState.OPEN,
             priority: number = TaskPriority.MAJOR,
             modify_date: number = DateTime.now().toMillis(),
             create_date: number = DateTime.now().toMillis(),
             bg_color: string = null,
             deleted: number = null,
  ): Task {
    return {
      title,
      content,
      modify_date,
      create_date,
      state,
      bg_color,
      due_date,
      position,
      priority,
      deleted,
      list_id,
      type,
      handled: 0,
      uuid: Utils.generateId(),
    };
  }

  createLabel(title: string,
              board_id: number,
              bg_color: string = null,
              create_date: number = DateTime.now().toMillis(),
  ): Label {
    return {title, create_date, board_id, bg_color};
  }

  createHistoryEntry(task_id: number,
                     json: string,
                     history_date: number = DateTime.now().toMillis(),
  ): TaskHistory {
    return {json, task_id, history_date};
  }

  createHistoryEntrySerialize(task: Task,
                              history_date: number = DateTime.now().toMillis(),
  ): TaskHistory {
    const content: TaskHistoryContent = {
      title: task.title,
      content: task.content,
      due_date: task.due_date,
      state: task.state,
      priority: task.priority,
      bg_color: task.bg_color,
      position: task.position,
      deleted: task.deleted,
      list_id: task.list_id,
      handled: task.handled,
      type: task.type,
      labels: task.$labels?.length > 0 && task.$labels.map(l => l.id) || null
    };
    return {json: JSON.stringify(content), task_id: task.id, history_date};
  }

  createLabelConnection(label_id: number,
                        task_id: number,
                        create_date: number = DateTime.now().toMillis(),
                        markDeleted: boolean = false,
  ): TaskLabel {
    const deleted_date = markDeleted ? DateTime.now().toMillis() : null;
    return {label_id, task_id, create_date, deleted_date};
  }

}

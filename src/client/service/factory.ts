import { Injectable } from '@angular/core';
import { Board } from '../model/board';
import { Task } from '../model/task';
import { TaskList } from '../model/task-list';
import { Label } from '../model/label';
import { TaskHistory } from '../model/task-history';
import { TaskLabel } from '../model/task-label';
import { HistoryType } from '../model/history-type';
import { TaskType } from '../model/task-type';

@Injectable({
  providedIn: 'root',
})
export class Factory {
  static readonly COLOR_LIST = '#eee';
  static readonly COLOR_LABEL = '#1a6acc';
  
  
  createBoard(title: string,
              create_date: number = Date.now(),
              type_label_id: number = null,
              deleted: number = null,
  ): Board {
    return {title, create_date, type_label_id, deleted};
  }
  
  createList(title: string,
             board_id: number,
             position: number = 0,
             create_date: number = Date.now(),
             bg_color: string = null,
             deleted: number = null,
  ): TaskList {
    return {title, create_date, position, bg_color, deleted, board_id};
  }
  
  
  createTask(title: string,
             content: string,
             list_id: number = null,
             position: number = 0,
             due_date: number = null,
             type: TaskType = TaskType.STANDARD,
             state: number = 0,
             modify_date: number = Date.now(),
             create_date: number = Date.now(),
             bg_color: string = null,
             deleted: number = null,
  ): Task {
    return {title, content, modify_date, create_date, state, bg_color, due_date, position, deleted, list_id, type};
  }
  
  createLabel(title: string,
              board_id: number,
              bg_color: string = null,
              create_date: number = Date.now(),
  ): Label {
    return {title, create_date, board_id, bg_color};
  }
  
  createHistoryEntry(type: HistoryType,
                     task_id: number,
                     title: string = null,
                     content: string = null,
                     related_object: number = null,
                     state: number = null,
                     due_date: number = null,
                     task_type: TaskType = null,
                     added: string = null,
                     removed: string = null,
                     history_date: number = Date.now(),
  ): TaskHistory {
    return {type, task_id, title, content, state, due_date, related_object, task_type, added, removed, history_date};
  }
  
  createLabelConnection(label_id: number,
                        task_id: number,
                        create_date: number = Date.now(),
                        markDeleted: boolean = false,
  ): TaskLabel {
    const deleted_date = markDeleted ? Date.now() : null;
    return {label_id, task_id, create_date, deleted_date};
  }
  
}

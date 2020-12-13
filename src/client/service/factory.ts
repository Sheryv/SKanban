import { Injectable } from '@angular/core';
import { Board } from '../model/board';
import { Task } from '../model/task';
import { TaskList } from '../model/task-list';
import { Label } from '../model/label';
import { TaskHistory } from '../model/task-history';
import { TaskLabel } from '../model/task-label';

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
             state: number = 0,
             modify_date: number = Date.now(),
             create_date: number = Date.now(),
             bg_color: string = null,
             deleted: number = null,
  ): Task {
    return {title, content, modify_date, create_date, state, bg_color, due_date, position, deleted, list_id};
  }
  
  createLabel(title: string,
              bg_color: string = null,
              create_date: number = Date.now(),
  ): Label {
    return {title, create_date, bg_color};
  }
  
  createHistoryEntry(type: number,
                     task_id: number,
                     title: string = null,
                     content: string = null,
                     related_object: number = null,
                     state: number = null,
                     due_date: number = null,
                     history_date: number = Date.now(),
  ): TaskHistory {
    return {type, task_id, title, content, state, due_date, related_object, history_date};
  }
  
  createLabelConnection(label_id: number,
                        task_id: number,
                        create_date: number = Date.now(),
  ): TaskLabel {
    return {label_id, task_id, create_date};
  }
  
}

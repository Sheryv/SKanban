import { TaskSortField } from './task-sort-field';
import { SortDirection } from './sort-direction';

export interface Settings {
  ui: UiSettings;
}

export interface UiSettings {
  detailsWith: number;
  taskListWidth: number;
  taskItemPadding: number;
  taskItemSize: number;
  taskLabelShowText: number;
  taskShowContentSize: number;
  taskDueDateVisibility: boolean;
  codeParserConfig: string;
  listVisibleTaskConfig: { name: string, minVisible: number, lastVisibleDays: number, sortBy: TaskSortField, sortDir: SortDirection } [];
}

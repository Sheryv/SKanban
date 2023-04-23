export enum TaskState {
  OPEN = 0,
  IN_PROGRESS = 1,
  DONE = 100,
}

export const TASK_STATE_ATTR = new Map([
  [TaskState.OPEN, {icon: 'stars', color: '', title: 'Open'}],
  [TaskState.IN_PROGRESS, {icon: 'schedule', color: '', title: 'In progress'}],
  [TaskState.DONE, {icon: 'check_circle', color: '', title: 'Done'}],
]);

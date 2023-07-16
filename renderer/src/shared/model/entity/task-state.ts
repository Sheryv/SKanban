export enum TaskState {
  OPEN = 0,
  IN_PROGRESS = 1,
  DONE = 100,
}

export const TASK_STATE_ATTR = new Map([
  [TaskState.OPEN, {icon: 'stars', code: 'open', title: 'Open'}],
  [TaskState.IN_PROGRESS, {icon: 'schedule', code: 'in_progress', title: 'In progress'}],
  [TaskState.DONE, {icon: 'verified_user', code: 'done', title: 'Done'}],
]);

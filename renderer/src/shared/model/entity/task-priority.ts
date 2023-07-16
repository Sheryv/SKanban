export enum TaskPriority {
  TRIVIAL = 0,
  MINOR = 1,
  MAJOR = 2,
  CRITICAL = 3,
  // BLOCKER = 4,
}

export const TASK_PRIORITY_MAPPING = {
  'trivial': TaskPriority.TRIVIAL,
  'minor': TaskPriority.MINOR,
  'major': TaskPriority.MAJOR,
  'critical': TaskPriority.CRITICAL,
  // 'blocker': TaskPriority.BLOCKER,
};

export const TASK_PRIORITY_ATTR = new Map([
  [TaskPriority.TRIVIAL, {icon: 'tips_and_updates', code: 'trivial', title: 'Trivial'}],
  [TaskPriority.MINOR, {icon: 'keyboard_double_arrow_down', code: 'minor', title: 'Minor'}],
  [TaskPriority.MAJOR, {icon: 'keyboard_double_arrow_up', code: 'major', title: 'Major'}],
  [TaskPriority.CRITICAL, {icon: 'report', code: 'critical', title: 'Critical'}],
  // [TaskPriority.BLOCKER, {icon: 'block', code: 'blocker', title: 'Blocker'}],
]);

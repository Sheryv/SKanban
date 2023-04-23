export enum TaskPriority {
  TRIVIAL = 0,
  MINOR = 1,
  MAJOR = 2,
  CRITICAL = 3,
  BLOCKER = 4,
}

export const TASK_PRIORITY_MAPPING = {
  'trivial': TaskPriority.TRIVIAL,
  'minor': TaskPriority.MINOR,
  'major': TaskPriority.MAJOR,
  'critical': TaskPriority.CRITICAL,
  'blocker': TaskPriority.BLOCKER,
};

export const TASK_PRIORITY_ATTR = new Map([
  [TaskPriority.TRIVIAL, {icon: 'tips_and_updates', color: '', title: 'Trivial'}],
  [TaskPriority.MINOR, {icon: 'keyboard_double_arrow_down', color: '', title: 'Minor'}],
  [TaskPriority.MAJOR, {icon: 'keyboard_double_arrow_up', color: '', title: 'Major'}],
  [TaskPriority.CRITICAL, {icon: 'priority_high', color: '', title: 'Critical'}],
  [TaskPriority.BLOCKER, {icon: 'block', color: '', title: 'Blocker'}],
]);

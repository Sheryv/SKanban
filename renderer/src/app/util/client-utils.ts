import { NgZone } from '@angular/core';
import { Observable, OperatorFunction } from 'rxjs';
import { TaskSortField } from '../../shared/model/entity/task-sort-field';
import { TaskType } from '../../shared/model/entity/task-type';
import { DateTime } from 'luxon';
import { SortDirection } from '../../shared/model/entity/sort-direction';

export function runInZone<T>(zone: NgZone): OperatorFunction<T, T> {
  return (source) => {
    return new Observable(observer => {
      const onNext = (value: T) => zone.run(() => observer.next(value));
      const onError = (e: any) => zone.run(() => observer.error(e));
      const onComplete = () => zone.run(() => observer.complete());
      return source.subscribe(onNext, onError, onComplete);
    });
  };
}


export class ClientUtils {
  static readonly TASK_TYPES_LABELS = new Map<TaskType, string>([
    [TaskType.STANDARD, 'Standard'],
    [TaskType.NOTE, 'Note'],
  ]);

  static readonly TASK_ORDER_FIELD_LABELS = new Map<TaskSortField, string>([
    [TaskSortField.TITLE, 'Title'],
    [TaskSortField.CONTENT, 'Content'],
    [TaskSortField.MODIFY_DATE, 'Modify date'],
    [TaskSortField.CREATE_DATE, 'Create date'],
    [TaskSortField.DUE_DATE, 'Due date'],
  ]);

  static readonly SORT_DIRECTION_LABLES = new Map<SortDirection, string>([
    [SortDirection.ASC, 'Ascending ⇓'],
    [SortDirection.DESC, 'Descending ⇑'],
  ]);


  static getLangCode(): string {
    let l = localStorage.getItem('lang');
    if (!l) {
      l = navigator.language;
      localStorage.setItem('lang', l);
    }
    return l;
  }

  static getLang(): string {
    return this.getLangCode().substr(0, 2);
  }

  static formatOverdueDuration(date: DateTime): string {
    let line = date.toLocaleString(DateTime.TIME_SIMPLE);
    const diffSeconds = date.diffNow('seconds').seconds;
    const diff = Math.round(diffSeconds / 60);
    if (diff > 60 * 24 || diff < -60 * 24) {
      line += ', ' + date.toLocaleString(DateTime.DATE_MED);
    } else if (diffSeconds < 1) {
      if (diffSeconds > -60) {
        line += `, now`;
      } else if (diff > -60) {
        line += `, ${-Math.ceil(diff)} minutes overdue`;
      } else {
        line += `, ${-Math.ceil(diff / 60)} hours overdue`;
      }
    } else {
      if (diff < 60) {
        line += `, within ${Math.ceil(diff)} minutes`;
      } else {
        line += `, within ${Math.ceil(diff / 60)} hours`;
      }
    }
    return line;
  }


  // static mapHistoryType(type: HistoryType): string {
  //   const map = this.HISTORY_TYPE_LABELS;
  //   if (map.size === 0) {
  //     map.set(HistoryType.LABEL_REMOVE, 'Labels removed');
  //     map.set(HistoryType.LABEL_ADD, 'Labels added');
  //     map.set(HistoryType.TITLE_MODIFY, 'Title changed');
  //     map.set(HistoryType.CONTENT_MODIFY, 'Content changed');
  //     map.set(HistoryType.DUE_DATE_MODIFY, 'Due date changed');
  //     map.set(HistoryType.STATE_MODIFY, 'State changed');
  //     map.set(HistoryType.DELETE, 'Task deleted');
  //     map.set(HistoryType.LIST_CHANGE, 'Task moved to another list');
  //     map.set(HistoryType.TYPE_MODIFY, 'Task type changed');
  //   }
  //
  //   return map.get(type);
  // }


  /**
   * Performs a deep merge of objects and returns new object. Does not modify
   * objects (immutable) and merges arrays via concatenation.
   *
   * @param {...object} objects - Objects to merge
   * @returns {object} New object with merged key/values
   */
  static mergeDeep(...objects) {
    const isObject = obj => obj && typeof obj === 'object';

    return objects.reduce((prev, obj) => {
      Object.keys(obj).forEach(key => {
        const pVal = prev[key];
        const oVal = obj[key];

        if (Array.isArray(pVal) && Array.isArray(oVal)) {
          prev[key] = pVal.concat(...oVal);
        } else if (isObject(pVal) && isObject(oVal)) {
          prev[key] = this.mergeDeep(pVal, oVal);
        } else {
          prev[key] = oVal;
        }
      });

      return prev;
    }, {});
  }
}

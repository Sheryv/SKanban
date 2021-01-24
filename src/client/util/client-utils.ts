import { NgZone } from '@angular/core';
import { Observable, OperatorFunction } from 'rxjs';
import { HistoryType } from '../model/history-type';
import { TaskType } from '../model/task-type';

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
  private static readonly HISTORY_TYPE_LABELS = new Map<HistoryType, string>();
  
  private static readonly _TASK_TYPES_LABELS = new Map<TaskType, string>();
  
  public static readonly VERSION = '0.1.1';
  
  static get taskTypes(): Map<TaskType, string> {
    const map = this._TASK_TYPES_LABELS;
    if (map.size === 0) {
      map.set(TaskType.STANDARD, 'Standard');
      map.set(TaskType.NOTE, 'Note');
    }
    return map;
  }
  
  static getLangCode(): string {
    let l = localStorage.getItem('lang');
    if (!l) {
      l = 'pl-PL';
      localStorage.setItem('lang', l);
    }
    return l;
  }
  
  static getLang(): string {
    return this.getLangCode().substr(0, 2);
  }
  
  static groupBy<T, K>(list: T[], keyGetter: (item: T) => K): Map<K, T[]> {
    const map = new Map<K, T[]>();
    list.forEach((item) => {
      const key = keyGetter(item);
      const collection = map.get(key);
      if (!collection) {
        map.set(key, [item]);
      } else {
        collection.push(item);
      }
    });
    return map;
  }
  
  static mapHistoryType(type: HistoryType): string {
    const map = this.HISTORY_TYPE_LABELS;
    if (map.size === 0) {
      map.set(HistoryType.LABEL_REMOVE, 'Labels removed');
      map.set(HistoryType.LABEL_ADD, 'Labels added');
      map.set(HistoryType.TITLE_MODIFY, 'Title changed');
      map.set(HistoryType.CONTENT_MODIFY, 'Content changed');
      map.set(HistoryType.DUE_DATE_MODIFY, 'Due date changed');
      map.set(HistoryType.STATE_MODIFY, 'State changed');
      map.set(HistoryType.DELETE, 'Task deleted');
      map.set(HistoryType.LIST_CHANGE, 'Task moved to another list');
      map.set(HistoryType.TYPE_MODIFY, 'Task type changed');
    }
    
    return map.get(type);
  }
  
  static mapTaskType(type: TaskType): string {
    return this.taskTypes.get(type);
  }
  
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

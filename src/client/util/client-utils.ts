import { NgZone } from '@angular/core';
import { Observable, OperatorFunction } from 'rxjs';
import { HistoryType } from '../model/history-type';

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
    }
    
    return map.get(type);
  }
}

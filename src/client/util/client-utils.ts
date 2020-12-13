import { NgZone } from '@angular/core';
import { Observable, OperatorFunction } from 'rxjs';

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
}

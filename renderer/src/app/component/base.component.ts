import { Component, OnDestroy } from '@angular/core';
import { OperatorFunction, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  template: ''
})
export abstract class BaseComponent implements OnDestroy {

  protected destroyedEvent = new Subject<any>();

  protected bindLifeCycle<T>(): OperatorFunction<T, T> {
    return takeUntil(this.destroyedEvent);
  }

  ngOnDestroy(): void {
    this.destroyedEvent.next(true);
    this.destroyedEvent.complete();
  }
}

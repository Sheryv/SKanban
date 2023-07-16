import { Directive, ElementRef, HostListener, Input, OnDestroy, OnInit } from '@angular/core';
import { MatMenuTrigger } from '@angular/material/menu';
import { State } from '../service/state';
import { fromEvent, Subscription } from 'rxjs';

@Directive({
  selector: `[remoteMenuTrigger]`,
  exportAs: 'remoteMenuTrigger',
})
export class RemoteMenuTriggerDirective implements OnInit, OnDestroy {

  @Input('remoteMenuTrigger')
  triggerInput: MatMenuTrigger | { ref: MatMenuTrigger; eventType: 'click' | 'contextmenu' };

  private trigger: MatMenuTrigger;

  private eventType: 'click' | 'contextmenu' = 'click';

  private subs: Subscription;

  constructor(private state: State, private element: ElementRef<HTMLElement>) {
  }

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent) {
    if (this.eventType !== 'contextmenu') {
      this.handle(event, this.eventType);
    }
  }

  @HostListener('contextmenu', ['$event'])
  onContextMenu(event: MouseEvent) {
    if (this.eventType === 'contextmenu') {
      this.handle(event, this.eventType);
    }
  }

  ngOnInit(): void {
    if (this.triggerInput instanceof MatMenuTrigger) {
      this.trigger = this.triggerInput;
    } else {
      this.trigger = this.triggerInput.ref;
      this.eventType = this.triggerInput.eventType ?? this.eventType;
    }
    this.subs = fromEvent(document, 'contextmenu').subscribe(e => {
      if (this.trigger.menuOpen && !this.element.nativeElement.contains(e.target as Node)) {
        // const click = (this.trigger['_element'] as ElementRef<HTMLElement>).nativeElement;
        const menu = (this.trigger.menu['_elementRef'] as ElementRef<HTMLElement>).nativeElement;
        if (e.target !== menu && !menu.contains(e.target as Node)) {
          this.trigger.closeMenu();
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.subs?.unsubscribe();
  }

  private handle(event: MouseEvent, type: typeof this.eventType) {
    const elem = this.trigger['_element'] as ElementRef<HTMLElement>;
    elem.nativeElement.setAttribute('style', `position:absolute; visibility: hidden; top: ${event.clientY}; left: ${event.clientX}`);
    this.trigger.toggleMenu();
  }
}



import { Directive, ElementRef, OnInit } from '@angular/core';

@Directive({
  selector: '[appAutofocus]',
})
export class AutofocusDirective implements OnInit {
  
  constructor(private input: ElementRef) { }
  
  ngOnInit() {
    setTimeout(() => this.input.nativeElement.focus());
  }
  
}

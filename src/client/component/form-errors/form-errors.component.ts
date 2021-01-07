import { Component, Input, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { AbstractControl, FormControl } from '@angular/forms';

@Component({
  selector: 'app-form-errors, [app-form-errors]',
  templateUrl: './form-errors.component.html',
})
export class FormErrorsComponent implements OnInit {
  @Input()
  error: { key: string, value: any };
  
  constructor() {
  }
  
  ngOnInit(): void {
  }
  
}

import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-form-errors, [app-form-errors]',
  templateUrl: './form-errors.component.html',
})
export class FormErrorsComponent implements OnInit {
  @Input()
  error: { key: string; value: any; label?: string };

  constructor() {
  }

  ngOnInit(): void {
    if (!this.error.label && typeof this.error.value == 'string') {
      this.error.label = this.error.value;
    }
  }

}

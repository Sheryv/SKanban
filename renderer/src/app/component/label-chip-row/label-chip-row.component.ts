import { Component, Input, OnInit } from '@angular/core';
import { UiSettings } from '../../../shared/model/entity/settings';
import { ColorUtil } from '../../util/color-util';
import { Label } from '../../../shared/model/entity/label';

@Component({
  selector: 'app-label-chip-row',
  templateUrl: './label-chip-row.component.html',
})
export class LabelChipRowComponent implements OnInit {
  @Input()
  labels: Label[];
  @Input()
  settings: UiSettings;
  @Input()
  editable = false;

  constructor() {
  }

  ngOnInit(): void {
  }

}

import { Component, Input, OnInit } from '@angular/core';
import { UiSettings } from '../../model/settings';
import { Label } from '../../model/label';
import { ColorUtil } from '../../util/color-util';

@Component({
  selector: 'app-label-chip-row',
  templateUrl: './label-chip-row.component.html',
  styleUrls: ['./label-chip-row.component.scss'],
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
    this.labels.forEach(l => {
      l.$fgInvert = l.bg_color && ColorUtil.isLightColor(l.bg_color);
    });
  }
  
}

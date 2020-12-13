import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Label } from '../../model/label';
import { ColorUtil } from '../../util/color-util';

@Component({
  selector: 'app-label-chip',
  templateUrl: './label-chip.component.html',
})
export class LabelChipComponent implements OnInit {
  @Input()
  label: Label;
  @Input()
  editable = false;
  @Input()
  showText = true;
  @Output()
  removed: EventEmitter<Label> = new EventEmitter();
  
  constructor() {
  }
  
  ngOnInit(): void {
    this.label.$fgInvert = this.label.bg_color && ColorUtil.isLightColor(this.label.bg_color);
  }
  
}

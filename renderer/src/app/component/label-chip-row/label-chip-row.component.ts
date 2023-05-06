import { Component, Input, OnInit } from '@angular/core';
import { Label } from '../../../shared/model/entity/label';
import { Settings, SettingsService } from '../../service/settings.service';

@Component({
  selector: 'app-label-chip-row',
  templateUrl: './label-chip-row.component.html',
})
export class LabelChipRowComponent implements OnInit {
  @Input()
  labels: Label[];
  @Input()
  editable = false;

  ui: {
    itemFontSize: number;
    itemLabelTextVisibility: boolean;
  };

  constructor(private settings: SettingsService) {
    const update: (s: Settings) => void = s => {
      this.ui = {
        itemFontSize: s.ui.lists.itemFontSize.getValue(),
        itemLabelTextVisibility: s.ui.lists.itemLabelTextVisibility.getValue(),
      };
    };

    settings.changed.subscribe(s => update(s));
    update(settings.settingsDef);
  }

  ngOnInit(): void {
  }

}

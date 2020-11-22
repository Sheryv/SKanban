import { Injectable } from '@angular/core';
import { PropertiesService } from './properties.service';
import { Settings } from '../model/settings';
import { flatMap, mergeMap, tap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';

@Injectable()
export class SettingsService {
  constructor(private property: PropertiesService) {
  }
  
  private readonly DEFAULT_SETTINGS: Settings = {
    ui: {
      detailsWith: 25,
      taskListWidth: 300,
      taskItemPadding: 100,
      taskItemSize: 100,
      taskLabelShowText: 1,
      taskShowContentSize: 1,
    },
  };
  
  base: Settings;
  
  
  /*
    getDetailsWidth(): Observable<number> {
      return this.property.getValue('ui.details-width').pipe(map(v => {
        const r = Number(v);
        if (isNaN(r)) {
          return 25;
        }
        return r;
      }));
    }*/
  
  refresh(): Observable<any> {
    return this.property.getValue('settings').pipe(mergeMap(json => {
      if (json) {
        this.base = JSON.parse(json);
        return of(this.base);
      } else {
        this.base = this.DEFAULT_SETTINGS;
        return this.property.set('settings', JSON.stringify(this.DEFAULT_SETTINGS));
      }
    }));
  }
  
}

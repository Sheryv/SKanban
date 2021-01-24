import { Injectable, NgZone } from '@angular/core';
import { PropertiesService } from './properties.service';
import { Settings } from '../model/settings';
import { flatMap, mergeMap, tap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { DbExecResult } from '../../shared/model/db-exec-result';
import { inRangeField, notNullField } from '../../shared/util/utils';
import { ClientUtils, runInZone } from '../util/client-utils';

@Injectable()
export class SettingsService {
  constructor(private property: PropertiesService, private zone: NgZone) {
  }
  
  private readonly DEFAULT_SETTINGS: Settings = {
    ui: {
      detailsWith: 25,
      taskListWidth: 300,
      taskItemPadding: 100,
      taskItemSize: 100,
      taskLabelShowText: 1,
      taskShowContentSize: 3,
      taskDueDateVisibility: true,
      codeParserConfig: ''
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
        this.base = ClientUtils.mergeDeep(this.DEFAULT_SETTINGS, this.base);
        return of(this.base);
      } else {
        this.base = this.DEFAULT_SETTINGS;
        return this.save(this.DEFAULT_SETTINGS);
      }
    }));
  }
  
  save(set: Settings): Observable<DbExecResult> {
    inRangeField(set.ui, 'detailsWith', 10, 90);
    inRangeField(set.ui, 'taskListWidth', 50);
    inRangeField(set.ui, 'taskItemPadding', 10);
    inRangeField(set.ui, 'taskItemSize', 10);
    inRangeField(set.ui, 'taskLabelShowText', 0, 1);
    inRangeField(set.ui, 'taskShowContentSize', 0, 50);
    
    return this.property.set('settings', JSON.stringify(set)).pipe(runInZone(this.zone), tap(r => this.base = set));
  }
}

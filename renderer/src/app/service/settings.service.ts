import { Injectable, NgZone } from '@angular/core';
import { PropertiesService } from './properties.service';
import { Bool, Field, Num, Obj, Select, Settings, Text } from '../../shared/model/entity/settings';
import { map, mergeMap, tap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { inRangeField, Utils } from '../../shared/util/utils';
import { ClientUtils, runInZone } from '../util/client-utils';
import { DbExecResult } from '../../shared/model/db';
import { DateFormatDef } from '../../shared/model/date-format-def';
import { TaskSortField } from '../../shared/model/entity/task-sort-field';
import { SortDirection } from '../../shared/model/entity/sort-direction';

export type ListTasksVisibilityConfig = typeof SettingsService.prototype.settingsDef.ui.lists.itemVisibilityConfig

@Injectable()
export class SettingsService {
  constructor(private property: PropertiesService, private zone: NgZone) {
  }

  private prefix = 'settings.';


  dateFormat: DateFormatDef;


  readonly settingsDef = {
    ui: {
      label: 'User interface',
      general: {
        label: 'General',
        dateFormat: new Select('Date format', 'dateFormat', new Map(Utils.SUPPORTED_DATE_FORMATS.map(d => [d.code, d.label])), true, Utils.SUPPORTED_DATE_FORMATS[0].code),
      },
      lists: {
        label: 'Lists of tasks',
        listWidth: new Num('Task list width [px]', 'lists.listWidth', 300, true, 20000, 50),
        itemFontSize: new Num('Task item font size [%]', 'lists.itemFontSize', 100, true, 1000, 10),
        itemPadding: new Num('Task item padding [%]', 'lists.itemPadding', 100, true, 20000, 10),
        itemLabelTextVisibility: new Bool('Label text visibility', 'lists.itemLabelTextVisibility', true),
        itemContentVisibleLines: new Num('Number of content lines visible for each task', 'lists.itemContentVisibleLines', 3, true, 200, 0).withHint('Set 0 to hide content displaying'),
        itemDueDateVisibility: new Bool('Due date visibility', 'lists.itemDueDateVisibility', true),
        detailsWith: new Num('Task details panel width [%]', 'lists.detailsWith', 25, true, 90, 10),
        itemVisibilityConfig: new Obj('Automatic hiding of tasks', 'lists.itemVisibilityConfig', {
          name: new Text('List name', 'name', ''),
          minVisible: new Num('Min. number of visible tasks', 'minVisible', 10, true, 200, 1).withUiGridColumnSpecifier(6),
          lastVisibleDays: new Num('Hide task after days', 'lastVisibleDays', 14, true, 10000, 1).withUiGridColumnSpecifier(6),
          sortBy: new Select('Order by', 'sortBy', ClientUtils.TASK_ORDER_FIELD_LABELS, true, TaskSortField.CREATE_DATE).withUiGridColumnSpecifier(6),
          sortDir: new Select('Sort direction', 'sortDir', ClientUtils.SORT_DIRECTION_LABLES, true, SortDirection.DESC).withUiGridColumnSpecifier(6),
        }, 'itemVisibilityConfig'),
      },
      editor: {
        label: 'Task content editor / Markdown editor',
        codeParserConfig: new Text('Parse codes and replace with links', 'editor.codeParserConfig', '', 5, false).withHint('Each code in new line. Format: <regexp>;<url with $ indexed group number>'),
      },
    },
  };


  private readonly DEFAULT_SETTINGS: Settings = {
    ui: {
      detailsWith: 25,
      taskListWidth: 300,
      taskItemPadding: 100,
      taskItemSize: 100,
      taskLabelShowText: 1,
      taskShowContentSize: 3,
      taskDueDateVisibility: true,
      codeParserConfig: '',
      listVisibleTaskConfig: [],
    },
    dateFormat: 'local_short',
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
        this.init(this.base);
        return of(this.base);
      } else {
        this.base = this.DEFAULT_SETTINGS;
        this.init(this.base);
        return this.save(this.DEFAULT_SETTINGS);
      }
    }));
  }

  findFields(obj: any, onFound: (field: Field<any>) => void) {
    if (obj['type'] && Field.FIELD_TYPES.includes(obj['type'])) {
      onFound(obj);
    } else if (typeof obj == 'object') {
      for (const field in obj) {
        this.findFields(obj[field], onFound);
      }
    }
  }


  readFields(obj: any) {
    return this.property.getAllWithPrefix(this.prefix).pipe(
      map(rows => {
        this.findFields(obj, f => {
          const found = rows.find(r => r.key == f.code);
          if (found) {
            f.replaceValue(f.deserialize(found.value));
          }
        });
      }),
    );
  }

  saveFields(obj: any) {
    this.validate(obj);
    this.findFields(obj, f => {
      this.property.set(f.code, f.serialize());
    });
  }

  validate(obj: any) {
    const errors = [];
    this.findFields(obj, f => {
      errors.push(...f.validate(f.getValue()));
    });
    if (errors.length > 0) {
      throw new Error('Incorrect data passed as settings object. Found following problems: \n' + errors.join(',\n'));
    }
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

  private init(s: Settings) {
    this.dateFormat = Utils.SUPPORTED_DATE_FORMATS.find(f => f.code == s.dateFormat);
  }
}

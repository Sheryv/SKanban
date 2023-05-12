/* eslint-disable max-len */
import { Injectable, NgZone } from '@angular/core';
import { PropertiesService } from './properties.service';
import { Bool, DateField, Field, Num, Obj, Select, Text } from '../model/settings';
import { map, mergeMap, switchMap } from 'rxjs/operators';
import { forkJoin, Observable, of, Subject } from 'rxjs';
import { Utils } from '../../shared/util/utils';
import { ClientUtils } from '../util/client-utils';
import { DbExecResult } from '../../shared/model/db';
import { DateFormatDef } from '../../shared/model/date-format-def';
import { TaskSortField } from '../../shared/model/entity/task-sort-field';
import { SortDirection } from '../../shared/model/entity/sort-direction';
import { DateTime } from 'luxon';

export type ListTasksVisibilityConfig = typeof SettingsService.prototype.settingsDef.ui.lists.itemVisibilityConfig;
export type Settings = typeof SettingsService.prototype.settingsDef;

@Injectable()
export class SettingsService {

  changed = new Subject<Settings>();

  calculated: {
    dateFormat: DateFormatDef;
  };


  readonly settingsDef = {
    ui: {
      label: 'User interface',
      general: {
        label: 'General',
        dateFormat: new Select('Date format', 'dateFormat', new Map(Utils.SUPPORTED_DATE_FORMATS.map(d => [d.code, `${d.label}: ${d.dateTimeToString(Utils.START_TIME)}`])), true, Utils.SUPPORTED_DATE_FORMATS[0].code).withOptions({hint: ''}),
      },
      lists: {
        label: 'Lists of tasks',
        listWidth: new Num('Task list width [px]', 'lists.listWidth', 300, true, 20000, 50),
        itemFontSize: new Num('Task item font size [%]', 'lists.itemFontSize', 100, true, 1000, 10),
        itemPadding: new Num('Task item padding [%]', 'lists.itemPadding', 100, true, 20000, 10),
        itemLabelTextVisibility: new Bool('Label text visibility', 'lists.itemLabelTextVisibility', true),
        itemContentVisibleLines: new Num('Number of content lines visible for each task', 'lists.itemContentVisibleLines', 3, true, 200, 0).withOptions({hint: 'Set 0 to hide content displaying'}),
        itemDueDateVisibility: new Bool('Due date visibility', 'lists.itemDueDateVisibility', true),
        detailsWith: new Num('Task details panel width [%]', 'lists.detailsWith', 35, true, 90, 10),
        itemVisibilityConfig: new Obj('Automatic hiding of tasks', 'lists.itemVisibilityConfig', {
          name: new Text('List name', 'name', ''),
          minVisible: new Num('Min. number of visible tasks', 'minVisible', 10, true, 200, 1).withOptions({customCssClasses: this.gridColumnCss(6)}),
          lastVisibleDays: new Num('Hide task after days', 'lastVisibleDays', 14, true, 10000, 1).withOptions({customCssClasses: this.gridColumnCss(6)}),
          sortBy: new Select('Order by', 'sortBy', ClientUtils.TASK_ORDER_FIELD_LABELS, true, TaskSortField.CREATE_DATE).withOptions({customCssClasses: this.gridColumnCss(6)}),
          sortDir: new Select('Sort direction', 'sortDir', ClientUtils.SORT_DIRECTION_LABLES, true, SortDirection.DESC).withOptions({customCssClasses: this.gridColumnCss(6)}),
        }),
      },
      editor: {
        label: 'Task content editor / Markdown editor',
        codeParserConfig: new Text('Parse codes and replace with links', 'editor.codeParserConfig', '', 5, false).withOptions({hint: 'Each code in new line. Format: <regexp>;<url with $ indexed group number>'}),
      },
      notifications: {
        label: 'Notifications',
        enableDesktopNotification: new Bool('Enable system desktop notification', 'notifications.enableDesktopNotification', true),
        enableBringWindowToTop: new Bool(`Automatically show ${Utils.APP} window when new notification is generated (for priority Critical and higher)`, 'notifications.enableBringWindowToTop', true),
        reminderAheadShowTime: new Num('Time a reminder notification is shown before task due date [minutes]', 'notifications.reminderAheadShowTime', 15, true, 43200, 1),
        snoozeSkipsHolidays: new Bool('Skip holidays when using snooze (see calendar below)', 'notifications.snoozeSkipsHolidays', true),
        customHolidays: new Obj('Holidays list', 'notifications.holidaysList', {
          name: new Text('Name', 'name').withOptions({customCssClasses: this.gridColumnCss(6)}),
          date: new DateField('Date', 'date', null, true, DateTime.now().plus({year: 2}), DateTime.now().minus({year: 1})).withOptions({customCssClasses: this.gridColumnCss(6)}),
        }, '', true).withOptions({customCssClasses: this.gridColumnCss(8)}),
        calendar: new Obj('Holidays calendar', 'notifications.holidays', {}, 'holidaysCalendar').withOptions({customCssClasses: this.gridColumnCss(4)}),
        saturdaysAreHolidays: new Bool('Consider Saturdays holidays', 'notifications.saturdaysAreHolidays', true),
        sundaysAreHolidays: new Bool('Consider Sundays holidays', 'notifications.sundaysAreHolidays', true),
      },
    },
  };

  private prefix = 'settings.';

  constructor(private property: PropertiesService, private zone: NgZone) {
  }

  refresh(): Observable<any> {
    return this.readFields(this.settingsDef).pipe(switchMap(properties => this.init(properties)));
  }


  findFields(obj: any, onFound: (field: Field<any>, key: string) => void) {
    this.findFieldsInternal(obj, '_', onFound);
  }


  readFields<T>(obj: T) {
    return this.property.getAllWithPrefix(this.prefix).pipe(
      map(rows => {
        this.findFields(obj, f => {
          const found = rows.find(r => r.key === this.prefix + f.code);
          if (found) {
            f.replaceValue(f.deserialize(found.value));
          }
        });
        return obj;
      }),
    );
  }

  save(): Observable<DbExecResult[]> {
    return this.saveFields(this.settingsDef);
  }

  private saveFields(obj: any): Observable<DbExecResult[]> {
    this.validate(obj);
    const obs: Observable<DbExecResult>[] = [];
    this.findFields(obj, f => {
      const value = f.serialize();
      if (value !== null) {
        obs.push(this.property.set(this.prefix + f.code, value));
      }
    });
    return forkJoin(obs).pipe(mergeMap(res => this.init(this.settingsDef).pipe(map(() => res))));
  }

  private validate(obj: any) {
    const errors = [];
    this.findFields(obj, f => {
      errors.push(...f.validate(f.getValue()));
    });
    if (errors.length > 0) {
      throw new Error('Incorrect data passed as settings object. Found following problems: \n' + errors.join(',\n'));
    }
  }


  private findFieldsInternal(obj: any, key: string, onFound: (field: Field<any>, key: string) => void) {
    if (obj['type'] && Field.FIELD_TYPES.includes(obj['type'])) {
      onFound(obj, key);
    } else if (typeof obj == 'object') {
      for (const field in obj) {
        this.findFieldsInternal(obj[field], field, onFound);
      }
    }
  }

  private init(s: typeof this.settingsDef) {
    this.calculated = {
      dateFormat: Utils.SUPPORTED_DATE_FORMATS.find(f => f.code === s.ui.general.dateFormat.getValue()),
    };
    console.log('Loaded settings', this.settingsDef);
    this.changed.next(this.settingsDef);
    return of(true);
  }

  private gridColumnCss(gridSpecifier: number): string[] {
    return ['col-md-' + gridSpecifier];
  }
}

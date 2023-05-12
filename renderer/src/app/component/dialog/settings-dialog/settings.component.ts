import { Component, ElementRef, NgZone, TemplateRef, ViewChild } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  FormRecord,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Field, Num, Obj, Select, Text } from '../../../model/settings';
import { State } from '../../../service/state';
import { MessageService } from '../../../service/message.service';
import { SettingsService } from '../../../service/settings.service';
import { MatDialogRef } from '@angular/material/dialog';
import { MatCalendar, MatCalendarCellClassFunction } from '@angular/material/datepicker';
import { DateTime } from 'luxon';
import { ClientUtils } from '../../../util/client-utils';
import { DialogTemplateParams } from '../abstract-dialog/abstract-dialog.component';
import { ViewService } from '../../../service/view.service';
import { COUNTRY_CODES } from '../../../../shared/util/country-codes';
import { switchMap } from 'rxjs';
import { fromPromise } from 'rxjs/internal/observable/innerFrom';

type Row = { key: string; value: any; children?: Row[] };


@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
})
export class SettingsComponent {

  @ViewChild(MatCalendar)
  calendar: MatCalendar<DateTime>;
  form: FormGroup;
  defs: { key: string; value: any }[];

  countries = COUNTRY_CODES;
  locale: string;

  locales = ['pl', 'en'];

  calendarDayClassProvider: MatCalendarCellClassFunction<DateTime>;
  calendarDayFilter: (d: DateTime | null) => boolean;

  private customHolidaysControls: FormArray;

  constructor(private state: State,
              private message: MessageService,
              public settingsService: SettingsService,
              private dialogRef: MatDialogRef<SettingsComponent>,
              private zone: NgZone,
              private view: ViewService,
              private el: ElementRef,
              private fb: FormBuilder) {

    const def = settingsService.settingsDef;
    this.defs = this.toKeyValue(def);
    this.locale = ClientUtils.getLangCode();

    console.log(def, this.defs);

    const record = new FormRecord({});
    this.buildForm(def, record);
    const notificationSettings = this.settingsService.settingsDef.ui.notifications;
    this.customHolidaysControls = record.controls[notificationSettings.customHolidays.code] as FormArray;
    record.controls[notificationSettings.saturdaysAreHolidays.code].valueChanges.subscribe(() => this.calendarDayFilterFactory());
    record.controls[notificationSettings.sundaysAreHolidays.code].valueChanges.subscribe(() => this.calendarDayFilterFactory());
    this.form = record;
    this.calendarDayClassProviderFactory();
    this.calendarDayFilterFactory();
  }


  save() {
    console.log('value', this.form.value);
    if (this.form.valid) {
      this.readForm(this.settingsService.settingsDef, this.form.value);

      this.settingsService.save().subscribe(s => {
        this.message.successShort('Settings saved');
        this.dialogRef.close(this.settingsService.settingsDef);
      }, error1 => this.message.error('Cannot save ' + error1));

    } else {
      this.form.markAllAsTouched();
      this.message.error('Found errors in form');
      this.scrollToFirstInvalidControl();
    }
  }

  deleteRow(array: FormArray, index: number) {
    array.removeAt(index);
    this.calendarDayClassProviderFactory();
  }

  addRow(field: Row, array: FormArray) {
    array.push(this.createControlsFormObj(field.value, field.value.defaultValue[0]));
    this.calendarDayClassProviderFactory();
  }

  asField<T>(value: Record<string, any>): Field<any> {
    return value as Field<any>;
  }

  asSelect(value: Record<string, any>): Select {
    return value as Select;
  }

  asText(value: Record<string, any>): Text {
    return value as Text;
  }

  calendarDayClassProviderFactory() {
    const dates: DateTime[] = this.customHolidaysControls.value?.filter(r => r.date)?.map(row => DateTime.fromISO(row.date));
    this.calendarDayClassProvider = (cellDate, view) => {
      if (view === 'month') {
        return dates.some(d => d.day === cellDate.day && d.month === cellDate.month && d.year === cellDate.year)
          ? 'calendar-highlight-day'
          : '';
      }

      return '';
    };
    this.refreshCalendar();
  }



  calendarDayFilterFactory() {
    const sundays = this.form.controls[this.settingsService.settingsDef.ui.notifications.sundaysAreHolidays.code].value;
    const saturdays = this.form.controls[this.settingsService.settingsDef.ui.notifications.saturdaysAreHolidays.code].value;
    this.calendarDayFilter = (d: DateTime | null): boolean => {
      const day = (d || DateTime.now()).weekday;

      if ((sundays && day === 7) || (saturdays && day === 6)){
        return false;
      }
      return true;
    };
    this.refreshCalendar();
  }

  changeLocale(locale: string) {
    localStorage.setItem('lang', locale);
    window.location.reload();
  }

  loadPublicHolidays(template: TemplateRef<DialogTemplateParams>) {
    this.view.openAbstractDialog(template, {
      params: {
        title: 'Select country',
        template,
        acceptButtonLabel: 'Load holidays',
      },
      templateData: {
        selection: COUNTRY_CODES.find(c => c.code === this.locale.toUpperCase())?.code ?? COUNTRY_CODES.find(c => c.code === 'GB').code,
      },
    }).pipe(
      switchMap((result) => {
        const url = `https://date.nager.at/api/v3/publicholidays/${DateTime.now().year}/${result.selection}`;
        return fromPromise(fetch(url).then(r => r.json()).then(r => r as PublicHoliday[]));
      }),
    ).subscribe((result) => {
      const obj = this.settingsService.settingsDef.ui.notifications.customHolidays;
      for (const holiday of result.filter(h => h.global && h.types.includes('Public'))) {
        const date = DateTime.fromFormat(holiday.date, 'yyyy-MM-dd');
        const current = this.customHolidaysControls.controls
          .find(c => DateTime.fromISO(c.value.date).toMillis() === date.toMillis()) as FormRecord;
        if (current) {
          current.controls['name'].setValue(holiday.name);
        } else {
          const v = obj.defaultValue[0];
          v.set('name', holiday.name);
          v.set('date', date);
          const control = this.createControlsFormObj(obj, v);
          this.customHolidaysControls.push(control);
        }
      }
      this.calendarDayClassProviderFactory();
    });
  }

  private scrollToFirstInvalidControl() {
    const firstInvalidControl: HTMLElement = this.el.nativeElement.querySelector(
      'form .ng-invalid',
    );

    firstInvalidControl.focus(); //without smooth behavior
  }

  private refreshCalendar() {
    const d = this.calendar?.activeDate as DateTime;
    if (d) {
      this.calendar.activeDate = d.plus({month: 1});
      setTimeout(() => {
        this.calendar.activeDate = d;
      }, 10);
    }
  }

  private toKeyValue(obj: any): Row[] {
    return Object.entries(obj).map(([key, value]) => {
        if (Field.isContainerField(value)) {
          return {key, value, children: this.toKeyValue(Object.fromEntries((value as Obj<any>).def))};
        } else if (Field.isValueField(value)) {
          return {key, value};
        } else if (typeof value == 'object') {
          return {key, value, children: this.toKeyValue(value)};
        }

        return null;
      },
    ).filter(s => !!s);
  }


  private buildForm(def: any, record: FormRecord) {
    for (const [_, v] of Object.entries(def)) {

      if (Field.isContainerField(v)) {
        const field = v as Obj<any>;
        const forms: AbstractControl[] = [];

        for (const inner of field.getValue() || []) {
          const items = this.createControlsFormObj(field, inner);

          forms.push(items);
        }

        const formArray = new FormArray(forms);
        // formArray['fieldDef'] = field;
        record.addControl(field.code, formArray);
        if (field.view.onValueChangeListener) {
          formArray.valueChanges.subscribe(formValue => field.view.onValueChangeListener(formValue, formArray, this.form));
        }
      } else if (Field.isValueField(v)) {
        const field = v as Field<any>;
        const control = new FormControl(field.getValue(), this.validators(field));
        // if (v instanceof DateField) {
        //   control.disable();
        // }
        record.addControl(field.code, control);
        if (field.view.onValueChangeListener) {
          control.valueChanges.subscribe(formValue => field.view.onValueChangeListener(formValue, control, this.form));
        }
      } else if (v != null && typeof v == 'object') {
        // console.log('inner ', Field.isContainerField(v), Field.isValueField(v), k, v);
        this.buildForm(v, record);
      }
    }
  }

  private readForm(def: Record<string, any>, form: Record<string, any>) {
    for (const [_, v] of Object.entries(def)) {

      if (Field.isContainerField(v)) {
        const field = v as Obj<any>;

        field.replaceValue(form[field.code].map(a => new Map(Object.entries(a))));
      } else if (Field.isValueField(v)) {
        const field = v as Field<any>;
        field.replaceValue(form[field.code]);
      } else if (v != null && typeof v == 'object') {
        // console.log('inner ', Field.isContainerField(v), Field.isValueField(v), k, v);
        this.readForm(v, form);
      }
    }
  }

  private createControlsFormObj<T extends Record<string, Field<any>>>(field: Obj<T>, value: Map<keyof T, any>) {
    const row = this.fb.record({});
    for (const [k, v] of value) {

      const inner = field.def.get(k);
      row.addControl(inner.code, new FormControl(v, this.validators(inner)));
    }
    return row;
  }

  private validators(field: Field<any>): ValidatorFn[] {
    const v = [];
    if (field instanceof Num) {
      if (field.required) {
        v.push(Validators.required);
      }
      v.push(Validators.min(field.min));
      v.push(Validators.max(field.max));
      v.push((control: AbstractControl) =>
        control.value == null
        || (typeof control.value === 'number' && isFinite(control.value) && Math.floor(control.value) === control.value)
          ? null
          : {notInt: 'Provided value is not an integer'},
      );
    } else if (field instanceof Text) {
      if (field.required) {
        v.push(Validators.required);
      }
      v.push(Validators.minLength(field.minLength));
      v.push(Validators.maxLength(field.maxLength));
    } else if (field instanceof Select) {
      if (field.required) {
        v.push(Validators.required);
      }
    }

    v.push((control: AbstractControl) => {
      let res = null;
      field.validate(control.value).map((s, i) => {
        res = (res || {});
        res[i] = s;
      });
    });

    return v;
  }
}

type PublicHoliday = {

  date: string;
  localName: string;
  name: string;
  countryCode: string;
  fixed: boolean;
  global: boolean;
  counties: string[];
  launchYear: number;
  types: ('Bank' | 'School' | 'Authorities' | 'Optional' | 'Observance' | 'Public')[];
};

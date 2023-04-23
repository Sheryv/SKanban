import { Component, ElementRef, NgZone } from '@angular/core';
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
import { Field, Num, Obj, Select, Text, UiSettings } from '../../../../shared/model/entity/settings';
import { State } from '../../../service/state';
import { MessageService } from '../../../service/message.service';
import { SettingsService } from '../../../service/settings.service';
import { MatDialogRef } from '@angular/material/dialog';
import { ClientUtils } from '../../../util/client-utils';
import { TaskSortField } from '../../../../shared/model/entity/task-sort-field';
import { SortDirection } from '../../../../shared/model/entity/sort-direction';

type Row = { key: string, value: any, children?: Row[] }


@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
})
export class SettingsComponent {

  ui: UiSettings;
  form: FormGroup;
  readonly numberPattern = /^\d+$/;
  taskOrders: Map<TaskSortField, string> = ClientUtils.TASK_ORDER_FIELD_LABELS;
  sortDir = SortDirection;

  defs: { key: string, value: any }[];

  constructor(private state: State,
              private message: MessageService,
              public settingsService: SettingsService,
              private dialogRef: MatDialogRef<SettingsComponent>,
              private zone: NgZone,
              private el: ElementRef,
              private fb: FormBuilder) {

    const def = settingsService.settingsDef;
    this.defs = this.toKeyValue(def);

    console.log(this.defs);

    const record = new FormRecord({});
    this.buildForm(def, record);
    this.form = record;
  }



  save() {
    console.log('value', this.form.value)
    if (this.form.valid) {
      console.log('valid');
      // const u: UiSettings = {
      //   detailsWith: this.toNumber(this.form.value.detailsWith),
      //   taskListWidth: this.toNumber(this.form.value.taskListWidth),
      //   taskItemPadding: this.toNumber(this.form.value.taskItemPadding),
      //   taskItemSize: this.toNumber(this.form.value.taskItemSize),
      //   taskLabelShowText: this.toNumber(this.form.value.taskLabelShowText),
      //   taskShowContentSize: this.toNumber(this.form.value.taskShowContentSize),
      //   taskDueDateVisibility: this.toBool(this.form.value.taskDueDateVisibility),
      //   codeParserConfig: this.form.value.codeParserConfig,
      //   listVisibleTaskConfig: this.form.get('listVisibleTaskConfig').value,
      // };
      // this.dialogRef.close(u);
    } else {
      this.form.markAllAsTouched()
      this.message.error("Found errors in form")
      this.scrollToFirstInvalidControl()
    }
  }

  deleteRow(array: FormArray, index: number) {
    array.removeAt(index);
  }

  addRow(field: Row, array: FormArray) {
    array.push(this.createObjFormRow(field.value, field.value.defaultValue[0]));
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

  private scrollToFirstInvalidControl() {
    const firstInvalidControl: HTMLElement = this.el.nativeElement.querySelector(
      "form .ng-invalid"
    );

    firstInvalidControl.focus(); //without smooth behavior
  }

  private toKeyValue(s: any): Row[] {
    return Object.entries(s).map(([key, value]) => {
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


  private buildForm(obj: any, record: FormRecord) {
    for (let [k, v] of Object.entries(obj)) {

      if (Field.isContainerField(v)) {
        const field = v as Obj<any>;
        const forms: AbstractControl[] = [];

        for (let inner of field.getValue() || []) {
          const items = this.createObjFormRow(field, inner);

          forms.push(items);
        }

        const formArray = new FormArray(forms);
        formArray['fieldDef'] = field;
        record.addControl(k, formArray);
        // this.buildForm(v, formRecord);
      } else if (Field.isValueField(v)) {
        const field = v as Field<any>;
        record.addControl(k, new FormControl(field.getValue(), this.validators(field)));
      } else if (v != null && typeof v == 'object') {
        // console.log('inner ', Field.isContainerField(v), Field.isValueField(v), k, v);
        this.buildForm(v, record);
      }
    }
  }

  private createObjFormRow<T extends Record<string, Field<any>>>(field: Obj<T>, value: Map<keyof T, any>) {
    const row = this.fb.record(Object.fromEntries(value));
    for (let controlsKey in row.controls) {
      const control = row.get(controlsKey);
      control.setValidators(this.validators(field.def.get(controlsKey)))
    }
    return row
  }

  private validators(field: Field<any>): ValidatorFn[] {
    const v = [];
    if (field instanceof Num) {
      field.required && v.push(Validators.required);
      v.push(Validators.min(field.min));
      v.push(Validators.max(field.max));
      v.push((control: AbstractControl) =>
        control.value == null || (typeof control.value === 'number' && isFinite(control.value) && Math.floor(control.value) === control.value)
          ? null
          : {notInt: 'Provided value is not an integer'},
      );
    } else if (field instanceof Text) {
      field.required && v.push(Validators.required);
      v.push(Validators.minLength(field.minLength));
      v.push(Validators.maxLength(field.maxLength));
    } else if (field instanceof Select) {
      field.required && v.push(Validators.required);
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

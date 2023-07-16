import { AbstractControl, FormGroup } from '@angular/forms';
import { DateTime } from 'luxon';

export type FieldType = typeof Field.FIELD_TYPES[number];

export abstract class Field<T> {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  static FIELD_TYPES = ['number', 'text', 'bool', 'select', 'object', 'object_array', 'date'] as const;

  readonly type: FieldType;

  readonly code: string;
  readonly label: string;
  readonly defaultValue: T | null;

  view: {
    hint?: string;
    customCssClasses?: string[];
    onValueChangeListener?: (controlValue: T, control: AbstractControl, form: FormGroup) => void;
  } = {
    customCssClasses: [],
  };

  protected value?: T;


  static isValueField(obj) {
    return !!obj['type'] && Field.FIELD_TYPES.includes(obj['type']);
  }

  static isContainerField(obj) {
    return !!obj['type'] && (obj['type'] === 'object' || obj['type'] === 'object_array');
  }

  replaceValue(v: T) {
    this.value = v;
  }

  getValue() {
    return this.value ?? this.defaultValue;
  }

  updateOptions(options: typeof Field.prototype.view) {
    this.view = Object.assign(this.view, options);
  }

  validate(value: T): string[] {
    return [];
  }

  serialize(): string {
    return '' + this.getValue();
  }

  // protected findFields(obj: any, onFound: (field: Field<any>) => void) {
  //   if (obj['type'] && Field.FIELD_TYPES.includes(obj['type'])) {
  //     onFound(obj);
  //   } else if (typeof obj == 'object') {
  //     for (const field in obj) {
  //       this.findFields(obj[field], onFound);
  //     }
  //   }
  // }

  abstract deserialize(value: string): T;

}


export class Num extends Field<number> {

  readonly type: FieldType = 'number';

  constructor(
    readonly label: string,
    readonly code: string,
    readonly defaultValue: number | null = null,
    readonly required: boolean = true,
    readonly max: number = Number.MAX_VALUE,
    readonly min: number = 0,
    readonly integer: boolean = true,
  ) {
    super();
  }

  override validate(value: number): string[] {
    const errors: string[] = [];
    if (value == null && this.required) {
      errors.push(`Field '${this.label}' [${this.code}] is required and cannot be null`);
    } else {
      const num = Number(value);
      if (isNaN(num)) {
        errors.push(`Field '${this.label}' [${this.code}] is not a number. '${value}' cannot be parsed as number`);
      } else {
        if (this.integer && Math.round(num) !== num) {
          errors.push(`Field '${this.label}' [${this.code}] is not an integer. '${value}' cannot be parsed as whole integer`);
        }

        if (num < this.min) {
          errors.push(`Field '${this.label}' [${this.code}] value is too low. ${num} < ${this.min}`);
        }
        if (num > this.max) {
          errors.push(`Field '${this.label}' [${this.code}] value is too high. ${num} > ${this.max}`);
        }
      }
    }
    return errors;
  }

  withOptions(options: typeof Field.prototype.view): Num {
    this.updateOptions(options);
    return this;
  }

  deserialize(value: string): number {
    return Number(value);
  }
}

export class Text extends Field<string> {

  readonly type: FieldType = 'text';

  constructor(
    readonly label: string,
    readonly code: string,
    readonly defaultValue: string | null = null,
    readonly lines: number = 1,
    readonly required: boolean = true,
    readonly maxLength: number = 10000,
    readonly minLength: number = 0,
  ) {
    super();
  }

  override validate(value: string): string[] {
    const errors: string[] = [];
    if (value == null && this.required) {
      errors.push(`Field '${this.label}' [${this.code}] is required and cannot be null`);
    } else if (typeof value != 'string') {
      errors.push(`Field value '${this.label}' [${this.code}] is not string - '${value}' is not string`);
    } else {
      if (value.length < this.minLength) {
        errors.push(`Field '${this.label}' [${this.code}] value is too short. ${value.length} < ${this.minLength}`);
      }
      if (value.length > this.maxLength) {
        errors.push(`Field '${this.label}' [${this.code}] value is too long. ${value.length} > ${this.maxLength}`);
      }
    }
    return errors;
  }

  deserialize(value: string): string {
    return value;
  }

  withOptions(options: typeof Field.prototype.view): Text {
    this.updateOptions(options);
    return this;
  }
}


export class Select extends Field<string> {

  readonly type: FieldType = 'select';

  getKey = this.getValue;

  listValues: [string, string][];

  constructor(
    readonly label: string,
    readonly code: string,
    readonly values: Map<string, string>,
    readonly required: boolean = true,
    readonly defaultValue: string | null = null,
    readonly lines: number = 1,
  ) {
    super();
    this.listValues = [...values.entries()];
  }

  getSelectedValue(): string {
    return this.values.get(this.getValue());
  }


  override validate(value: string): string[] {
    const errors: string[] = [];
    if (value == null && this.required) {
      errors.push(`Field '${this.label}' [${this.code}] is required and cannot be null`);
    } else if (typeof value != 'string') {
      errors.push(`Field value '${this.label}' [${this.code}] is not string convertable - '${value}' is not string`);
    }
    return errors;
  }

  deserialize(value: string): string {
    return value;
  }

  withOptions(options: typeof Field.prototype.view): Select {
    this.updateOptions(options);
    return this;
  }
}

export class Bool extends Field<boolean> {

  readonly type: FieldType = 'bool';

  constructor(
    readonly label: string,
    readonly code: string,
    readonly defaultValue: boolean = false,
  ) {
    super();
  }

  override validate(value: boolean): string[] {
    const errors: string[] = [];
    if (value == null) {
      errors.push(`Field '${this.label}' [${this.code}] is required and cannot be null`);
    } else if (typeof value != 'boolean') {
      errors.push(`Field value '${this.label}' [${this.code}] is not boolean - '${value}' is not boolean`);
    }
    return errors;
  }

  deserialize(value: string): boolean {
    return value === 'true';
  }

  withOptions(options: typeof Field.prototype.view): Bool {
    this.updateOptions(options);
    return this;
  }
}

export class DateField extends Field<DateTime> {

  readonly type: FieldType = 'date';

  constructor(
    readonly label: string,
    readonly code: string,
    readonly defaultValue: DateTime | null = null,
    readonly required: boolean = true,
    readonly max: DateTime = DateTime.now().plus({year: 100}),
    readonly min: DateTime = DateTime.now().minus({year: 100}),
  ) {
    super();
  }

  override validate(value: DateTime): string[] {
    const errors: string[] = [];
    if (value == null && this.required) {
      errors.push(`Field '${this.label}' [${this.code}] is required and cannot be null`);
    } else {
      let v = value;
      if (typeof value == 'string') {
        v = DateTime.fromISO(value);
      }

      if (!DateTime.isDateTime(v)) {
        errors.push(`Field '${this.label}' [${this.code}] is not a date. '${v}' cannot be parsed as date (type ${typeof v})`);
      } else {
        if (v.toMillis() < this.min.toMillis()) {
          errors.push(`Field '${this.label}' [${this.code}] value is too low. ${v} < ${this.min}`);
        }
        if (v.toMillis() > this.max.toMillis()) {
          errors.push(`Field '${this.label}' [${this.code}] value is too high. ${v} > ${this.max}`);
        }
      }
    }
    return errors;
  }

  getValue() {
    if (this.value && typeof this.value == 'string') {
      this.value = DateTime.fromISO(this.value);
    }

    return this.value || this.defaultValue;
  }

  serialize(): string {
    return this.getValue().toISO();
  }

  deserialize(value: string): DateTime {
    return DateTime.fromISO(value);
  }

  withOptions(options: typeof Field.prototype.view): DateField {
    this.updateOptions(options);
    return this;
  }
}


export class Obj<V extends Record<string, Field<any>>> extends Field<Map<keyof V, any>[]> {

  override readonly type: FieldType = 'object_array';

  readonly def: Map<keyof V, Field<any>>;

  override readonly defaultValue: Map<keyof V, any>[] = [];

  constructor(
    readonly label: string,
    readonly code: string,
    def: V,
    readonly uiTemplate: string = '',
    readonly inlineRemoveRowButton = false,
  ) {
    super();
    this.def = new Map(Object.entries(def));

    const defaults = new Map<string, any>();
    for (const [, field] of this.def) {
      defaults.set(field.code, field.defaultValue);
    }
    this.defaultValue = [defaults];
  }

  override validate(): string[] {
    const errors: string[] = [];
    const arr = this.getValue();
    if (arr != null) {
      arr.forEach((value, index) => {
        for (const [k, d] of this.def.entries()) {
          errors.push(...d.validate(value.get(k)).map(m => `${m} (at index ${index})`));
        }
      });
    }
    return errors;
  }


  override serialize(): string {
    return JSON.stringify(this.getValue().map(value => {
      const result = {};
      for (const [k, v] of value?.entries() || []) {
        result[this.def.get(k).code] = v;
      }
      return result;
    }));
  }

  override deserialize(json: string): Map<keyof V, any>[] {
    const parsed: any[] = JSON.parse(json);

    return parsed.map(p => {
      const map = new Map<keyof V, any>();
      const d = [...this.def.entries()];
      for (const [field, value] of Object.entries(p)) {
        const key = d.find(([, v]) => v.code === field)[0];
        map.set(key, value);
      }
      return map;
    });
  }

  withOptions(options: typeof Field.prototype.view): Obj<V> {
    this.updateOptions(options);
    return this;
  }
}

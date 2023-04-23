import { TaskSortField } from './task-sort-field';
import { SortDirection } from './sort-direction';

export interface Settings {
  ui: UiSettings;
  dateFormat: string;
}

export interface UiSettings {
  detailsWith: number;
  taskListWidth: number;
  taskItemPadding: number;
  taskItemSize: number;
  taskLabelShowText: number;
  taskShowContentSize: number;
  taskDueDateVisibility: boolean;
  codeParserConfig: string;
  listVisibleTaskConfig: { name: string, minVisible: number, lastVisibleDays: number, sortBy: TaskSortField, sortDir: SortDirection } [];
}


export type FieldType = typeof Field.FIELD_TYPES[number];
export abstract class Field<T> {
  static FIELD_TYPES = ['number', 'text', 'bool', 'select', 'object', 'object_array'] as const;
  static isValueField(obj) {
    return !!obj['type'] && Field.FIELD_TYPES.includes(obj['type']);
  }

  static isContainerField(obj) {
    return !!obj['type'] && (obj['type'] == 'object' || obj['type'] == 'object_array');
  }

  private value?: T;

  readonly type: FieldType;

  readonly code: string;
  readonly label: string;
  readonly defaultValue: T | null;
  hint?: string;

  customCssClasses: string[] = [];

  replaceValue(v: T) {
    this.value = v;
  }

  getValue() {
    return this.value || this.defaultValue;
  }

  withHint(hint: string): Field<T> {
    this.hint = hint;
    return this;
  }

  withCssClasses(...classes: string[]): Field<T> {
    this.customCssClasses.push(...classes);
    return this;
  }

  withUiGridColumnSpecifier(gridSpecifier: number): Field<T> {
    return this.withCssClasses('col-md-' + gridSpecifier);
  }

  validate(value: T): string[] {
    return [];
  }

  serialize(): string {
    return '' + this.getValue();
  }

  abstract deserialize(value: string): T

  protected findFields(obj: any, onFound: (field: Field<any>) => void) {
    if (obj['type'] && Field.FIELD_TYPES.includes(obj['type'])) {
      onFound(obj);
    } else if (typeof obj == 'object') {
      for (const field in obj) {
        this.findFields(obj[field], onFound);
      }
    }
  }
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
        if (this.integer && Math.round(num) != num) {
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
}


export class Select extends Field<string> {

  readonly type: FieldType = 'select';

  constructor(
    readonly label: string,
    readonly code: string,
    readonly values: Map<string, string>,
    readonly required: boolean = true,
    readonly defaultValue: string | null = null,
    readonly lines: number = 1,
  ) {
    super();
  }

  getSelectedValue(): string {
    return this.values.get(this.getValue());
  }

  getKey = this.getValue;

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
    return Boolean(value);
  }
}


export class Obj<V extends Record<string, Field<any>>> extends Field<Map<keyof V, any>[]> {

  readonly type: FieldType;

  readonly def: Map<keyof V, Field<any>>;

  readonly defaultValue: Map<keyof V, any>[];

  constructor(
    readonly label: string,
    readonly code: string,
    def: V,
    readonly uiTemplate: string,
    readonly isArray: boolean = false,
  ) {
    super();
    this.type = isArray ? 'object_array' : 'object';
    this.def = new Map(Object.entries(def));

    const defaults = new Map<string, any>();
    for (let [, field] of this.def) {
      defaults.set(field.code, field.defaultValue);
    }
    this.defaultValue = [defaults];
  }

  override validate(): string[] {
    const errors: string[] = [];
    const arr = this.getValue();
    if (arr != null) {
      arr.forEach((value, index) => {
        for (let [k, d] of this.def.entries()) {
          errors.push(...d.validate(value.get(k)).map(m => `${m} (at index ${index})`));
        }
      });
    }
    return errors;
  }


  override serialize(): string {
    return JSON.stringify(this.getValue().map(value => {
      let result = {};
      for (let [k, v] of value?.entries() || []) {
        result[this.def.get(k).code] = v;
      }
      return result;
    }));
  }

  override deserialize(value: string): Map<keyof V, any>[] {
    const parsed: any[] = JSON.parse(value);

    return parsed.map(p => {
      const map = new Map<keyof V, any>();
      const d = [...this.def.entries()];
      for (let [field, value] of p.entries()) {
        const key = d.find(([, v]) => v.code == field)[0];
        map.set(key, value);
      }
      return map;
    });
  }
}

import { DateTime, Settings } from 'luxon';
import { LabeledRow } from './labeled-row';

export class DateFormatDef implements LabeledRow {

  private stringFormat: string;

  constructor(
    public code: string,
    public label: string,
    // public format: (date: DateTime) => string,
    public format: Intl.DateTimeFormatOptions | string,
    public formatWithoutSeconds: Intl.DateTimeFormatOptions | string = null,
    // public placeholder: string = null,
    public parse?: (date: string) => DateTime,
  ) {
    if (typeof format == 'string') {
      this.stringFormat = format;
    } else {
      this.stringFormat = DateTime.parseFormatForOpts(format);
    }

    if (formatWithoutSeconds == null && typeof format == 'object') {
      const f = {...format}
      f.second = undefined;
      this.formatWithoutSeconds = f;
    }
  }

  public dateFromString(text: string): DateTime {
    if (this.parse) {
      return this.parse(text);
    }

    return DateTime.fromFormat(text, this.stringFormat, {locale: Settings.defaultLocale});
  }

  public dateToString(date: DateTime, withoutSeconds: boolean = false): string {
    let f = this.format;
    if (withoutSeconds && this.formatWithoutSeconds == null) {
      console.error(`withoutSeconds is not supported by this format '${this.code}'`);
    } else if (withoutSeconds) {
      f = this.formatWithoutSeconds;
    }

    if (typeof f == 'string') {
      return date.toFormat(f, {locale: Settings.defaultLocale});
    } else {
      return date.toLocaleString(f);
    }
  }
}

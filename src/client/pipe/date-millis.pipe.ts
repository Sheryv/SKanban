import { Pipe, PipeTransform } from '@angular/core';
import { DateTime } from 'luxon';

@Pipe({name: 'dateMillis'})
export class DateMillisPipe implements PipeTransform {

  transform(value, withTime?: boolean): string {
    const s = Number(value);
    if (s) {
      const format = withTime === true ? DateTime.DATETIME_SHORT : DateTime.DATE_SHORT;
      const dateTime = DateTime.fromMillis(s);
      return dateTime.toLocaleString(format);
    }
    return '-';
  }
}

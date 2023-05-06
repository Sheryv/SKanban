import { Pipe, PipeTransform } from '@angular/core';
import { DateTime } from 'luxon';
import { SettingsService } from '../service/settings.service';

@Pipe({name: 'dateMillis'})
export class DateMillisPipe implements PipeTransform {

  constructor(private settings: SettingsService) {
  }

  transform(value, withSeconds?: boolean): string {
    const s = Number(value);
    if (s) {
      return this.settings.calculated.dateFormat.dateTimeToString(DateTime.fromMillis(s), !withSeconds);
      // const format = withSeconds === true ? DateTime.DATETIME_SHORT_WITH_SECONDS : DateTime.DATETIME_SHORT;
      // const dateTime = DateTime.fromMillis(s);
      // return dateTime.toLocaleString(format);
    }
    return '-';
  }
}

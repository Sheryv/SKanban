import { Pipe, PipeTransform } from '@angular/core';
import { DateTime } from 'luxon';
import { Utils } from '../../shared/util/utils';
import { SettingsService } from '../service/settings.service';

@Pipe({name: 'dateUser'})
export class DateUserPipe implements PipeTransform {

  constructor(private settings: SettingsService) {
  }

  transform(value, withSeconds?: boolean): string {
    if (value instanceof DateTime) {
      // const format = withSeconds === true ? DateTime.DATETIME_SHORT_WITH_SECONDS : DateTime.DATETIME_SHORT;
      return this.settings.dateFormat.dateToString(value, !withSeconds);
    }
    return '-';
  }
}

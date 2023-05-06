import {
  LuxonDateAdapter,
  MAT_LUXON_DATE_ADAPTER_OPTIONS,
  MatLuxonDateAdapterOptions,
} from '@angular/material-luxon-adapter';
import { DateTime } from 'luxon';
import { SettingsService } from '../service/settings.service';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { Inject, Injectable, Optional } from '@angular/core';
import { ClientUtils } from './client-utils';

@Injectable()
export class CustomDateAdapter extends LuxonDateAdapter {

  constructor(private settings: SettingsService,
              @Optional() @Inject(MAT_LUXON_DATE_ADAPTER_OPTIONS) options?: MatLuxonDateAdapterOptions) {
    super(ClientUtils.getLangCode(), options);
    this.setLocale(ClientUtils.getLangCode());
  }

  override format(date: DateTime, displayFormat: string): string {
    return this.settings.calculated.dateFormat.dateToString(date);
  }
}

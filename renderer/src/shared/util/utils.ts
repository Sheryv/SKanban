import { DateTime, Settings } from 'luxon';
import { DateFormatDef } from '../model/date-format-def';

export class Utils {
  static readonly DB_NAME = 'database.db';
  static readonly APP = 'SKanban';

  private static readonly CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  static readonly SUPPORTED_DATE_FORMATS: DateFormatDef[] = [
    new DateFormatDef(
      'local_short',
      'Local short',
      DateTime.DATETIME_SHORT_WITH_SECONDS,
      // (date: DateTime) => date.toLocaleString(DateTime.DATETIME_SHORT_WITH_SECONDS),
      // DateTime.parseFormatForOpts(DateTime.DATETIME_SHORT_WITH_SECONDS),
    ),
    new DateFormatDef(
      'local_med',
      'Local short',
      DateTime.DATETIME_MED_WITH_SECONDS,
      // (date: DateTime) => date.toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS),
      // DateTime.parseFormatForOpts(DateTime.DATETIME_MED_WITH_SECONDS),
    ),
    new DateFormatDef(
      'local_long',
      'Local short',
      DateTime.DATETIME_FULL_WITH_SECONDS,
      // (date: DateTime) => date.toLocaleString(DateTime.DATETIME_FULL_WITH_SECONDS),
      // DateTime.parseFormatForOpts(DateTime.DATETIME_FULL_WITH_SECONDS),
    ),
    new DateFormatDef(
      'global_iso',
      'Global ISO',
      // (date: DateTime) => date.toISO(),
      'yyyy-MM-dd\'T\'HH:mm:ss.SSSZZ',
    ),
  ];

  static generateId(length: number = 8) {
    let result = '';
    const charactersLength = this.CHARACTERS.length;
    for (let i = 0; i < length; i++) {
      result += this.CHARACTERS.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

  static generateNumber() {
    return Math.floor(Math.random() * 1000000000000);
  }

  static groupBy<T, K>(list: T[], keyGetter: (item: T) => K): Map<K, T[]> {
    const map = new Map<K, T[]>();
    list.forEach((item) => {
      const key = keyGetter(item);
      const collection = map.get(key);
      if (!collection) {
        map.set(key, [item]);
      } else {
        collection.push(item);
      }
    });
    return map;
  }

  static toUnderscoreCase(inputString) {
    return inputString.split('').map((character, index) => {
      if (character === character.toUpperCase()) {
        return (index !== 0 ? '_' : '') + character.toLowerCase();
      } else {
        return character;
      }
    })
      .join('');
  }

  static isNumber(value): boolean {
    if (typeof value == 'string') {
      return !isNaN(+value) && !isNaN(parseFloat(value));
    } else if (typeof value == 'number') {
      return isFinite(value);
    } else {
      return false;
    }
  }

  static parseIntNum(value): number | null {
    if (typeof value == 'string') {
      let parsed = parseInt(value);
      return isFinite(parsed) ? parsed : null;
    } else if (typeof value == 'number') {
      return isFinite(value) ? value : null;
    }
    return null;
  }

  static titleToPath(title: string): string {
    const regex = new RegExp(/[<>:"'\\|/?*]/g);

    // @ts-ignore
    return title.replace(' ', '_').replaceAll(regex, '') + '.md';
  }
}

export function notNull(ob, msg: string) {
  if (ob == null) {
    throw new Error(msg);
  }
}

export function notNullField(ob, field: string) {
  notNull(ob, 'Field \'' + field + '\' is required and cannot be null');
}

export function inRangeField(ob, field: string, min: number = null, max: number = null) {
  notNull(ob, 'Field \'' + field + '\' is required and cannot be null');
  const num = Number(ob[field]);
  if (isNaN(num)) {
    throw new Error(`Field '${field}' is not a number. '${ob[field]}' cannot be parsed as number`);
  }

  if (min != null && num < min) {
    throw new Error(`Field '${field}' value is too low. ${num} < ${min}`);
  }
  if (max != null && num > max) {
    throw new Error(`Field '${field}' value is too high. ${num} > ${max}`);
  }
}

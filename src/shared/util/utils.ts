import { app } from 'electron';

export class Utils {
  
  private static readonly CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  
  static readonly DB_NAME = 'database.db';
  
  static generateId(length: number = 6) {
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
}

export function isDev() {
  let AppConfig;
  try {
    AppConfig = require('../../environments/environment');
  } catch (e) {
    console.log('Cannot load module', e);
  }
  
  return (app && !app.isPackaged) || (AppConfig && !AppConfig.production);
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

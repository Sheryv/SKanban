export class Utils {

  private static readonly CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  
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

export function notNull(ob, msg: string) {
  if (ob == null) {
    throw new Error(msg);
  }
}

export function notNullField(ob, field: string) {
  notNull(ob, 'Field \'' + field + '\' is required and cannot be null');
}

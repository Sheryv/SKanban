export class ColorUtil {
  static isLightColor(color: string) {
    const c = this.getRGB(color);
    const luma = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b; // per ITU-R BT.709
    return luma > 100;
  }
  
  private static getRGB(color: string): { r: number, g: number, b: number } {
    let r: number;
    let g: number;
    let b: number;
    
    if (color.startsWith('rgb')) {
      const match = color.match(/^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(,\s*\d+\s*)?\)$/i);
      r = Number(match[1]);
      g = Number(match[2]);
      b = Number(match[3]);
    } else if (color.startsWith('#')) {
      const c = color.substring(1);      // strip #
      const rgb = parseInt(c, 16);   // convert rrggbb to decimal
      // tslint:disable-next-line:no-bitwise
      r = (rgb >> 16) & 0xff;  // extract red
      // tslint:disable-next-line:no-bitwise
      g = (rgb >> 8) & 0xff;  // extract green
      // tslint:disable-next-line:no-bitwise
      b = (rgb >> 0) & 0xff;  // extract blue
    }
    return r ? {r, g, b} : null;
  }
}


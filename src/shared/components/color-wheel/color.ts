import tinycolor from 'tinycolor2';

import { toHex } from './helpers';

export class Color {
  public r: number;
  public g: number;
  public b: number;

  constructor(r: number, g: number, b: number) {
    this.r = r;
    this.g = g;
    this.b = b;
  }

  public getHexCode(): string {
    return `#${toHex(this.r)}${toHex(this.g)}${toHex(this.b)}`;
  }

  public desaturated(amount: number): Color {
    const saturated = tinycolor(this.getHexCode())
      .desaturate(100 - amount)
      .toRgb();
    return new Color(saturated.r, saturated.g, saturated.b);
  }
}

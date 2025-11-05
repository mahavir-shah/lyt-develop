import { Injectable } from '@angular/core';

import { Color } from '../../shared/components/color-wheel/color';
import { Subject } from 'rxjs';

class Preset {
  public colors: Color[];

  constructor(colors: Color[]) {
    this.colors = colors;
  }
}

@Injectable({ providedIn: 'root' })
class PresetsService {
  public presets: Preset[] = [
    new Preset([
      new Color(255, 0, 0),
      new Color(255, 0, 127),
      new Color(0, 0, 255),
      new Color(0, 255, 0),  
      new Color(255, 255, 0),  
      new Color(255, 165, 0),  
      new Color(0, 128, 0),  
      new Color(0, 255, 255),
      new Color(128, 0, 128),
      new Color(128, 0, 0),  
      new Color(128, 128, 0),
      new Color(0, 128, 128),
      new Color(0, 128, 255),
      new Color(128, 0, 255),
      new Color(255, 105, 180)
    ])
    /* new Preset([
      new Color(121, 241, 124),
      new Color(42, 141, 250),
      new Color(11, 21, 42)
    ]),
    new Preset([
      new Color(126, 221, 11),
      new Color(142, 0, 50),
      new Color(211, 21, 42)
    ]),
    new Preset([
      new Color(101, 21, 24),
      new Color(142, 41, 250),
      new Color(11, 211, 42)
    ]) */
  ];

  private presetSelectedSource = new Subject<any>();
  presetSelected$ = this.presetSelectedSource.asObservable();

  constructor() {}
  
  emitPreset(preset: any) {
    console.log('selected RGB Preset:', preset)
    this.presetSelectedSource.next(preset);
  }
}

export { Preset, PresetsService };



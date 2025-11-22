// presets.service.ts

import { Injectable } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';

import { Color } from '../../shared/components/color-wheel/color';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export type AnimationType = "pulse" | "wave" | "strobe" | "mix" | null;

/**
 * Preset emit payload:
 * - either a single color (for static selection)
 * - or a colors array (for rotating presets)
 */
export interface PresetEmitPayload {
  // When single static color is desired:
  color?: Color;
  // When rotating through a preset's palette:
  colors?: Color[];
  animation: AnimationType;
  speed: number | null; // milliseconds, or null for static
  iosCancel?: true | false;  //  represents cancelling
  brightness: number | null; // milliseconds, or null for static
}

export class Preset {
  public colors: Color[];

  constructor(colors: Color[]) {
    this.colors = colors;
  }
}

@Injectable({ providedIn: 'root' })
export class PresetsService {

  // The actual color sets
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
  ];

  private presetSelectedSource = new Subject<PresetEmitPayload>();
  public presetSelected$ = this.presetSelectedSource.asObservable();

  // publish the currently animated color hex or null (when deactivated)
  private activeColorSource = new Subject<string | null>();
  public activeColor$ = this.activeColorSource.asObservable();

  private clearColorPickerBackSubscription = new Subject<boolean>();
  public clearColorPickerBackEffect$ = this.clearColorPickerBackSubscription.asObservable();

  private brightnessSource = new Subject<number | null>();
  public brightnessSelected$ = this.brightnessSource.asObservable();

  private speedSubject = new BehaviorSubject<number>(1000);
  public speed$ = this.speedSubject.asObservable();

  constructor() { }

  // Emit a preset event (static color OR rotating colors)
  emitPreset(payload: PresetEmitPayload) {
    console.log('Preset emitted:', payload);
    this.presetSelectedSource.next(payload);
  }

  // Update active color (called by color-picker while rotating)
  updateActiveColor(hexOrNull: string | null) {
    this.activeColorSource.next(hexOrNull);
  }

  // Update active color (called by color-picker while rotating)
  updateBrightness(value: number | null) {
    this.brightnessSource.next(value);
  }

  // alias for compatibility with previous naming
  publishActiveColor(hexOrNull: string | null) {
    this.updateActiveColor(hexOrNull);
  }

  removeColorPickerBackEffect(payload: boolean) {
    this.clearColorPickerBackSubscription.next(payload);
  }

  public setSpeed(ms: number) {
    this.speedSubject.next(ms);
  }
}

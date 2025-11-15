// presets.ts
import { Component, OnInit, OnDestroy } from '@angular/core';

import { Location } from '@angular/common';
import { PresetsService, Preset, AnimationType } from '../../shared/services/presets.service';
import { Color } from 'src/shared/components/color-wheel/color';
import { DevicesService } from 'src/shared/services/devices.service';
import { Subscription } from 'rxjs';

export type AnimationEffect = 'pulse' | 'wave' | 'strobe' | 'mix';

@Component({
  selector: 'presets',
  templateUrl: 'presets.html',
  styleUrl: 'presets.scss',
  standalone: false,
})
export class PresetsPage implements OnInit, OnDestroy {
  public preset: Preset;
  public currentValue: any;

  public animationEffects: AnimationEffect[] = ['pulse', 'wave', 'strobe', 'mix'];

  private colorIndex: number = 0;

  public lastActiveColor: Color | null;

  private activeColorSub: Subscription | null = null;

  constructor(
    public location: Location,
    public presetService: PresetsService,
    public deviceService: DevicesService
  ) {
    this.lastActiveColor = this.deviceService?.connectedDevice?.color || null;

    this.currentValue = {
      speedPercent: 50,
      presetStatus: false,
      animation: 'pulse',
      activeColor: null
    };

    this.currentValue.speed = this.convertPercentToMs(this.currentValue.speedPercent);
    this.deviceService.currentPresetValue = {
      speedPercent: this.currentValue.speedPercent,
      speed: this.currentValue.speed
    };

    // subscribe to active color broadcasts so UI highlights reflect actual animated color
    this.activeColorSub = this.presetService.activeColor$.subscribe(hex => {
      this.currentValue.activeColor = hex;
    });
  }

  ngOnInit() { }

  ngOnDestroy() {
    if (this.activeColorSub) {
      this.activeColorSub.unsubscribe();
      this.activeColorSub = null;
    }
    // persist slider state
    this.deviceService.currentPresetValue = this.currentValue;
  }

  // Convert % → ms
  private convertPercentToMs(percent: number): number {
    const minMs = 2000; // slowest
    const maxMs = 200;  // fastest
    return Math.round(minMs - (percent / 100) * (minMs - maxMs));
  }

  onSpeedChanged() {
    this.currentValue.speed = this.convertPercentToMs(this.currentValue.speedPercent);
  }

  formatPercentPin(v: number) {
    return v + '%';
  }

  // Activate preset: static selection (first color)
  public activatePreset(preset: Preset): void {
    const first = preset.colors && preset.colors.length ? preset.colors[0] : null;
    if (!first) return;

    this.presetService.emitPreset({
      color: first,
      animation: null,
      speed: null
    });

    // update UI state
    this.currentValue.presetStatus = false;
    this.currentValue.activeColor = first.getHexCode();

    this.location.back();
  }

  // START rotation + animation across the preset colors
  public changeAnimation(animation: AnimationEffect) {
    // pick the palette (first preset) - adjust as you need
    this.preset = this.presetService.presets[0];
    if (!this.preset || !this.preset.colors || this.preset.colors.length === 0) return;

    // Tell color-picker to start rotating these colors, running the chosen animation
    this.currentValue.presetStatus = true;
    this.currentValue.animation = animation;
    this.currentValue.activeColor = this.preset.colors[0].getHexCode();

    this.presetService.emitPreset({
      colors: this.preset.colors.slice(), // pass the array
      animation: (animation as AnimationType),
      speed: this.currentValue.speed
    });
  }

  // Deactivate preset: stop rotation & restore last color
  public deactivatePreset() {
    const restoreColor = this.lastActiveColor;

    // emit a stop by sending a single static color payload (animation=null)
    if (restoreColor) {
      this.presetService.emitPreset({
        color: restoreColor,
        animation: null,
        speed: null
      });

      // ensure UI highlight cleared/restored
      this.presetService.updateActiveColor(restoreColor.getHexCode());
      this.currentValue.activeColor = restoreColor.getHexCode();
    } else {
      // if no restore color, send a null activeColor signal to clear highlight
      this.presetService.emitPreset({
        animation: null,
        speed: null
      });

      this.presetService.updateActiveColor(null);
      this.currentValue.activeColor = null;
    }

    this.currentValue = {
      speedPercent: this.currentValue.speedPercent,
      speed: this.currentValue.speed,
      animation: 'pulse',
      presetStatus: false,
      activeColor: null,
    };
  }
}

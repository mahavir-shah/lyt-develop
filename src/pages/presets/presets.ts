import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { PresetsService, Preset } from '../../shared/services/presets.service';
import { Color } from 'src/shared/components/color-wheel/helpers';
import { DevicesService } from 'src/shared/services/devices.service';

export type AnimationEffect = 'Pulse' | 'Wave' | 'Strobe' | 'Mix';

@Component({
  selector: 'presets',
  templateUrl: 'presets.html',
  styleUrl: 'presets.scss',
  standalone: false,
})

export class PresetsPage implements OnInit {
  public preset
  public currentValue: any;
  public animationEffects: AnimationEffect[] = ['Pulse', 'Wave', 'Strobe', 'Mix'];
  private speedIntervalId: any;
  private constantIntervalId: any;
  private mainIntervalId: any;
  public lastActiveColor: Color;
  private colorIndex: number = 0; // Add this at class level

  constructor(
    public location: Location,
    public presetService: PresetsService,
    public deviceService: DevicesService
  ) {
    this.lastActiveColor = this.deviceService?.connectedDevice?.color;
    this.currentValue = this.deviceService?.currentPresetValue;
  }

  ngOnInit() { }

  public activatePreset(preset: Preset): void {
    this.presetService.emitPreset(preset);
    this.location.back();
  }

  changeSpeed(event) {
    this.currentValue.speed = event.detail.value;
  }

  public formatSpeedPin(value: number): string {
    return value.toFixed(1) + ' s';
  }

  changeAnimation(animation) {
    // Clear any existing intervals
    if (this.speedIntervalId) {
      clearInterval(this.speedIntervalId);
    }
    if (this.constantIntervalId) {
      clearInterval(this.constantIntervalId);
    }

    this.preset = this.presetService.presets[0];
    this.currentValue.animation = animation;
    this.currentValue.presetStatus = true;
    this.colorIndex = 0;

    const getCurrentColor = () => {
      return this.preset?.colors[this.colorIndex];
    };

    const cycleToNextColor = () => {
      this.colorIndex++;
      if (this.colorIndex >= this.preset?.colors?.length) {
        this.colorIndex = 0;
      }
    };

    // Emit immediately: Color1 WITH animation
    const firstColor = getCurrentColor();
    this.currentValue.activeColor = firstColor?.getHexCode();
    this.presetService.emitPreset({
      color: firstColor,
      animation: animation,
      speed: this.currentValue.speed
    });

    // After 'speed' seconds, emit color retention for first color
    setTimeout(() => {
      const currentColor = getCurrentColor();
      this.presetService.emitPreset({ color: currentColor });

      // Then start the interval for subsequent colors
      this.constantIntervalId = setInterval(() => {
        const currentColor = getCurrentColor();
        this.presetService.emitPreset({ color: currentColor });
      }, (this.currentValue.speed + 2) * 1000);
    }, this.currentValue.speed * 1000);

    // Cycle colors and emit with animation every (speed + 2) seconds
    this.speedIntervalId = setInterval(() => {
      cycleToNextColor();
      const currentColor = getCurrentColor();
      this.currentValue.activeColor = currentColor?.getHexCode();
      this.presetService.emitPreset({
        color: currentColor,
        animation: animation,
        speed: this.currentValue.speed
      });
    }, (this.currentValue.speed + 0.020 + 2) * 1000);
  }

  deactivatePreset() {
    this.colorIndex = 0; // Reset index when animation changes
    this.presetService.emitPreset({ color: this.lastActiveColor });
    if (this.speedIntervalId) {
      clearInterval(this.speedIntervalId);
    }
    if (this.constantIntervalId) {
      clearInterval(this.constantIntervalId);
    }
    if (this.mainIntervalId) {
      clearInterval(this.mainIntervalId);
    }
    this.currentValue = {
      speed: this.currentValue.speed,
      animation: 'Pulse',
      presetStatus: false,
      activeColor: null,
    };
  }

  ngOnDestroy() {
    if (this.speedIntervalId) {
      clearInterval(this.speedIntervalId);
    }
    if (this.constantIntervalId) {
      clearInterval(this.constantIntervalId);
    }
    if (this.mainIntervalId) {
      clearInterval(this.mainIntervalId);
    }
    console.log('before left preset assign value to device service:', this.currentValue)
    this.deviceService.currentPresetValue = this.currentValue
  }
}

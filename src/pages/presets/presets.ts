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
    this.currentValue = {
      speedPercent: 50,
    };
    this.currentValue.speed = this.convertPercentToMs(this.currentValue.speedPercent);
  }

  ngOnInit() { }

  public activatePreset(preset: Preset): void {
    this.presetService.emitPreset(preset);
    this.location.back();
  }

  // Convert % → milliseconds
  private convertPercentToMs(percent: number): number {
    const minMs = 2000; // 2 seconds
    const maxMs = 200;  // 200 ms

    return minMs - (percent / 100) * (minMs - maxMs);
  }

  // When slider changes → emit ms value
  onSpeedChanged() {
    this.currentValue.speed = this.convertPercentToMs(this.currentValue.speedPercent);
    console.log("Speed in ms set:", this.currentValue.speed);
  }

  formatPercentPin(value: number): string {
    return value + '%';
  }

  /*changeAnimation(animation) {
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
      }, (this.currentValue.speed + 2000));
    }, this.currentValue.speed);

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
    }, (this.currentValue.speed + 20 + 2000));
  }*/

  /*
  ```

## Key changes:

1. ✅ **Removed `constantIntervalId` logic** - no separate retention phase
2. ✅ **Removed hardcoded `+ 2000`** - uses only user-configured `speed` value
3. ✅ **Single interval** - emits preset every `speed` milliseconds
4. ✅ **Cleaner code** - removed unnecessary setTimeout and second interval
5. ✅ **Simple flow**: 
 - Emit first color immediately
 - Every `speed` ms: cycle to next color and emit with animation

## Timeline example (with speed = 500ms):
```
Time 0ms:    Color1 WITH animation (immediate)
Time 500ms:  Color2 WITH animation (interval fires)
Time 1000ms: Color3 WITH animation (interval fires)
Time 1500ms: Color4 WITH animation (interval fires)
...and so on
  */
  changeAnimation(animation) {
    // Clear any existing interval
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

    // Emit immediately for first color with animation
    const firstColor = getCurrentColor();
    this.currentValue.activeColor = firstColor?.getHexCode();
    this.presetService.emitPreset({
      color: firstColor,
      animation: animation,
      speed: this.currentValue.speed
    });

    // Set interval to cycle colors and emit with animation
    // Runs every 'speed' milliseconds (user-configured slider value)
    this.speedIntervalId = setInterval(() => {
      cycleToNextColor();
      const currentColor = getCurrentColor();
      this.currentValue.activeColor = currentColor?.getHexCode();
      this.presetService.emitPreset({
        color: currentColor,
        animation: animation,
        speed: this.currentValue.speed
      });
    }, this.currentValue.speed);
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

    this.currentValue = {
      speedPercent: this.currentValue.speedPercent, // Preserve slider position
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

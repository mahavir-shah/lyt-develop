import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { Platform, NavController } from '@ionic/angular';

import { ColorWheel } from '../../shared/components/color-wheel/color-wheel';

import { Color } from '../../shared/components/color-wheel/color';
import { Device } from '../../shared/models/device.model';
import { Preset, PresetsService } from '../../shared/services/presets.service';

import { DevicesService } from '../../shared/services/devices.service';

import { PresetsPage } from '../../pages/presets/presets';
import { DebugPage } from '../../pages/debug/debug';
import { SearchInProgressPage } from '../../pages/search-in-progress/search-in-progress';

enum SliderType {
  left,
  right
}

@Component({
  selector: 'color-picker',
  templateUrl: 'color-picker.html',
  standalone: false,
})
export class ColorPickerPage implements OnInit, AfterViewInit {
  @ViewChild(ColorWheel)
  colorWheel: ColorWheel;

  public color: Color;
  public adjustedColor: Color;

  public brightnessLevel: number;
  public saturationLevel: number;

  public connectedDevice: Device;

  public bottomColorCircle: any;

  public colorChangeTimeout: any;

  public preset: Preset;

  constructor(
    public devicesService: DevicesService,
    public platform: Platform,
    public navCtrl: NavController,
    public presetService: PresetsService
  ) {
    this.connectedDevice = this.devicesService.connectedDevice;
    this.color = this.devicesService.connectedDevice.color;
    this.adjustedColor = this.devicesService.connectedDevice.color;
  }

  ngOnInit() {
    this.presetService.presetSelected$.subscribe(async (data) => {
      // 'pulse' | 'wave' | 'strobe' | 'mix' | 'none'; 
      if (data?.speed && data?.animation) {
        console.log('selected animation: ', data.animation)
        console.log('selected color: ', data.color)
        console.log('selected speed: ', data.speed)
        if (data.animation == 'pulse') {
          await this.connectedDevice.pulse(data.color, (data?.speed * 1000))
        } else if (data.animation == 'wave') {
          await this.connectedDevice.wave(data.color, (data?.speed * 1000))
        } else if (data.animation == 'strobe') {
          await this.connectedDevice.strobe(data.color, (data?.speed * 1000))
        } else if (data.animation == 'mix') {
          await this.connectedDevice.mix(data.color, (data?.speed * 1000))
        }
      } else {
        this.connectedDevice.stop();
        await this.connectedDevice.writeColor(data.color);
      }
    });

    this.platform.backButton.subscribeWithPriority(100, () => {
    });
  }

  ngAfterViewInit() {
    this.bottomColorCircle = document.getElementById('bottom-color-circle');

    if (this.bottomColorCircle && this.adjustedColor) {
      this.bottomColorCircle.style.backgroundColor = this.adjustedColor.getHexCode();
    }
  }

  public setColor(color: Color) {
    this.color = color;
    this.adjustedColor = this.getAdjustedColor();

    if (this.color != this.adjustedColor) {
      this.colorWheel.setColor(this.adjustedColor);
    }

    if (this.bottomColorCircle) {
      this.bottomColorCircle.style.backgroundColor = this.adjustedColor.getHexCode();
    }
  }

  public setBrightnessLevel(brightnessLevel: number): void {
    this.brightnessLevel = brightnessLevel;
    this.updateSliderOfType(SliderType.left);

    if (this.saturationLevel == undefined || this.saturationLevel == 100) {
      this.connectedDevice.setLedBrightness(brightnessLevel, this.adjustedColor);
    }
    else {
      this.connectedDevice.applyBrightnessAndSaturation(this.adjustedColor, brightnessLevel, this.saturationLevel);
    }
  }

  public setSaturationLevel(saturationLevel: number): void {
    this.saturationLevel = saturationLevel;
    this.updateSliderOfType(SliderType.right);

    this.adjustedColor = this.getAdjustedColor();
    this.colorWheel.setColor(this.adjustedColor);

    if (this.bottomColorCircle) {
      this.bottomColorCircle.style.backgroundColor = this.adjustedColor.getHexCode();
    }

    if (this.brightnessLevel == undefined || this.brightnessLevel == 100) {
      this.connectedDevice.setSaturationLevel(saturationLevel, this.adjustedColor);
    }
    else {
      this.connectedDevice.applyBrightnessAndSaturation(this.adjustedColor, this.brightnessLevel, saturationLevel);
    }
  }

  public getAdjustedColor(): Color {
    return this.color.desaturated(this.saturationLevel);
  }

  public updateSliderOfType(sliderType: SliderType): void {
    const sliderDotNumber =
      (sliderType == SliderType.left
        ? this.brightnessLevel
        : this.saturationLevel) / 10;
    const sliderTypeString = sliderType === SliderType.left ? 'left' : 'right';

    for (let i = 1; i <= 10; i++) {
      const dotElement = document.getElementById(
        `${sliderTypeString}-slider-dot-${i}`
      );
      i === sliderDotNumber
        ? dotElement.classList.add('active')
        : dotElement.classList.remove('active');
    }
  }

  public changeDeviceColor(): void {
    this.colorChangeTimeout = setTimeout(() => {
      this.changeColor();
      clearTimeout(this.colorChangeTimeout);
      
      // Reset sliders to max
      this.brightnessLevel = 100;
      this.saturationLevel = 100;
      this.updateBrightnessDots(100);
      this.updateSaturationDots(100);
    }, 200);
  }

  private updateBrightnessDots(level: number) {
    for (let i = 1; i <= 10; i++) {
      const dot = document.getElementById(`left-slider-dot-${i}`);
      if (!dot) continue;

      if (i == (level / 10)) {
        dot.classList.add("active");
      } else {
        dot.classList.remove("active");
      }
    }
  }

  private updateSaturationDots(level: number) {
    for (let i = 1; i <= 10; i++) {
      const dot = document.getElementById(`right-slider-dot-${i}`);
      if (!dot) continue;

      if (i == (level / 10)) {
        dot.classList.add("active");
      } else {
        dot.classList.remove("active");
      }
    }
  }

  public changeColor(): void {
    this.connectedDevice.writeColor(this.adjustedColor);
  }

  public flash(): void {
    this.connectedDevice.flash(this.brightnessLevel);
  }

  public disconnect(): void {
    this.devicesService.connectedDevice.disconnect().then(() => {
      this.navCtrl.navigateRoot('/search-inprogress-page');
    });
  }

  public goToPresetsPage() {
    console.log('this.preset:', this.preset);
    /* this.presetService.emitPreset(({
      onPresetSelect: (preset: any) => {
        console.log('selected Preset:', preset)
        this.preset = preset
      }
    })); */

    this.navCtrl.navigateForward('/presets-page');
    /* this.presetService.emitPreset(({
      onPresetSelect: preset => (this.preset = preset)
    }), this.navCtrl); */
  }

  public goToDebugPage(): void {
    this.navCtrl.navigateForward('/debug-page');
  }

  public deactivatePreset(): void {
    this.preset = null;
  }
}

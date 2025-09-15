import { Component, ViewChild } from '@angular/core';
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
export class ColorPickerPage {
  @ViewChild(ColorWheel)
  colorWheel: ColorWheel;

  private color: Color;
  public adjustedColor: Color;

  private brightnessLevel: number;
  private saturationLevel: number;

  public connectedDevice: Device;

  private bottomColorCircle: any;

  private colorChangeTimeout: any;

  public preset: Preset;

  constructor(
    private devicesService: DevicesService,
    private platform: Platform,
    public navCtrl: NavController,
    private presetService: PresetsService
  ) {
    this.connectedDevice = this.devicesService.connectedDevice;
  }

  ionViewDidLoad() {
    this.platform.backButton.subscribeWithPriority(100, () => {
      // This blocks default back button behavior
      // console.log('Back button pressed, default prevented.');
    });

    this.bottomColorCircle = document.getElementById('bottom-color-circle');
    this.bottomColorCircle.style.backgroundColor = this.adjustedColor.getHexCode();
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

    this.connectedDevice.changeBrightnessLevel(brightnessLevel);
  }

  public setSaturationLevel(saturationLevel: number): void {
    this.saturationLevel = saturationLevel;
    this.updateSliderOfType(SliderType.right);

    this.adjustedColor = this.getAdjustedColor();
    this.colorWheel.setColor(this.adjustedColor);

    if (this.bottomColorCircle) {
      this.bottomColorCircle.style.backgroundColor = this.adjustedColor.getHexCode();
    }

    this.connectedDevice.changeSaturationLevel(saturationLevel);
  }

  private getAdjustedColor(): Color {
    return this.color.desaturated(this.saturationLevel);
  }

  private updateSliderOfType(sliderType: SliderType): void {
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
    }, 1000);
  }

  private changeColor(): void {
    this.connectedDevice.changeColor(this.adjustedColor);
  }

  public flash(): void {
    this.connectedDevice.flash(this.brightnessLevel);
  }

  public disconnect(): void {
    this.devicesService.connectedDevice.disconnect().then(() => {
      this.navCtrl.navigateRoot('/search-inprogress-page');
    });
  }

  public goToPresetsPage(): void {  
    this.presetService.emitPreset(({
      onPresetSelect: preset => (this.preset = preset)
    }));
    this.navCtrl.navigateForward('/presets-page');
  }

  public goToDebugPage(): void {
    this.navCtrl.navigateForward('/debug-page');
  }

  public deactivatePreset(): void {
    this.preset = null;
  }
}

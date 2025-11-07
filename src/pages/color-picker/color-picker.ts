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
  }

  ngOnInit() {
    this.presetService.presetSelected$.subscribe(data => {
      this.connectedDevice.changeColor(data.desaturated(this.saturationLevel));
      // this.presetSet(data)
    });

    this.platform.backButton.subscribeWithPriority(100, () => {
      // This blocks default back button behavior
      // console.log('Back button pressed, default prevented.');
    });
  }

  /* public async presetSet(data) {
    console.log('assinged preset function:', data)
      if(!this.preset?.colors) {
        this.preset = data;
        let i = 0;

        // 💡 FIX: Changed the function() { ... } to an arrow function () => { ... }
        const intervalId = setInterval(async () => { 
            // Now 'this' correctly refers to the class instance
            
            // Check loop condition carefully: use < or <= depending on if colors is 0-indexed
            if(i < data?.colors?.colors?.length) { 
                
                const currentColor = data?.colors?.colors[i];
                this.color = currentColor;
                console.log("color hexa code: ", currentColor?.getHexCode());

                this.adjustedColor = this.getAdjustedColor();
                
                this.setColor(currentColor);
                this.colorWheel.setColor(this.adjustedColor);
                this.colorWheel.setColorPosition(currentColor);
                this.connectedDevice.changeColor(this.adjustedColor);

                i++;
            } else {
                // Stop the interval once the loop is complete
                clearInterval(intervalId); 
            }
        }, data?.speed);

        // Store the interval ID if you need to manually stop it later
        // this.intervalId = intervalId;
      }
  } */

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
    }, 1000);
  }

  public changeColor(): void {
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

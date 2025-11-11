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
  public intervalId;
  public lastActiveColor: Color;

  constructor(
    public location: Location,
    public presetService: PresetsService,
    public deviceService: DevicesService
  ) {
    this.lastActiveColor = this.deviceService?.connectedDevice?.color;
    this.currentValue = this.deviceService?.currentPresetValue;
  }

  ngOnInit() {
    /* this.presetService.presetSelected$.subscribe(preset => {
      console.log('assinged preset function:', preset)
      this.onPresetSelect = preset;
    }); */
  }

  public activatePreset(preset: Preset): void {
    this.presetService.emitPreset(preset);
    this.location.back();
  }

  changeSpeed(event) {
    this.currentValue.speed = event.detail.value;
  }

  public formatSpeedPin(value: number): string {
    return value.toFixed(1) + 's';
  }

  changeAnimation(animation) {
    this.preset = this.presetService.presets[0];
    this.currentValue.animation = animation;
    this.currentValue.presetStatus = true;

    const currentColor = this.preset?.colors[0];
    this.currentValue.activeColor = currentColor?.getHexCode();
    this.presetService.emitPreset({color: currentColor, animation: animation});

    let i = 1;
    this.intervalId = setInterval(async () => { 
      if(i < this.preset?.colors?.length) { 
          const currentColor = this.preset?.colors[i];
          this.currentValue.activeColor = currentColor?.getHexCode();
          this.presetService.emitPreset({color: currentColor, animation: animation});
          i++;
      } else {
        clearInterval(this.intervalId); 
        this.changeAnimation(animation); 
      }
   }, (this.currentValue?.speed ?? 0) * 1000);

    // this.presetService.emitPreset({colors: this.preset, ...this.currentValue});
    // this.location.back();
  }

  deactivatePreset() {
    this.presetService.emitPreset(this.lastActiveColor);
    clearInterval(this.intervalId); 
    this.currentValue = {
      speed: this.currentValue.speed,
      animation: 'Pulse',
      presetStatus: false,
      activeColor: null,
    };
  }

  ngOnDestroy() {
    console.log('before left preset assign value to device service:', this.currentValue)
    this.deviceService.currentPresetValue = this.currentValue
  }
}

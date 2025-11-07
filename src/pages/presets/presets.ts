import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { PresetsService, Preset } from '../../shared/services/presets.service';

export type AnimationEffect = 'Pulse' | 'Wave' | 'Strobe' | 'Mix';

@Component({
  selector: 'presets',
  templateUrl: 'presets.html',
  styleUrl: 'presets.scss',
  standalone: false,
})

export class PresetsPage implements OnInit {
  public preset 
  public currentValue: any = {
    speed: 2000,
    animation: 'Pulse',
    presetStatus: false,
    activeColor: null,
  };
  public animationEffects: AnimationEffect[] = ['Pulse', 'Wave', 'Strobe', 'Mix'];
  public intervalId;

  constructor(
    public location: Location,
    public presetService: PresetsService,
  ) {}

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

  changeAnimation(animation) {
    this.preset = this.presetService.presets[0];
    this.currentValue.animation = animation;
    this.currentValue.presetStatus = true;

    let i = 0;
    this.intervalId = setInterval(async () => { 
      debugger
        if(i < this.preset?.colors?.length) { 
            const currentColor = this.preset?.colors[i];
            this.currentValue.activeColor = currentColor?.getHexCode();
            this.presetService.emitPreset(currentColor);
            i++;
        } else {
            this.currentValue = {
              speed: 2000,
              animation: 'Pulse',
              presetStatus: false,
              activeColor: null,
            };
            clearInterval(this.intervalId); 
        }
    }, this.currentValue?.speed);

    // this.presetService.emitPreset({colors: this.preset, ...this.currentValue});
    // this.location.back();
  }

  deactivatePreset() {
    clearInterval(this.intervalId); 
    this.currentValue = {
      speed: 2000,
      animation: 'Pulse',
      presetStatus: false,
      activeColor: null,
    };
  }
}

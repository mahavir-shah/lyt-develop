import { Component } from '@angular/core';
import { Location } from '@angular/common';

import { PresetsService, Preset } from '../../shared/services/presets.service';

export type AnimationEffect = 'Pulse' | 'Wave' | 'Strobe' | 'Mix';

@Component({
  selector: 'presets',
  templateUrl: 'presets.html',
  styleUrl: 'presets.scss',
  standalone: false,
})

export class PresetsPage {
  public preset 
  public currentValue: any = {
    speed: 200,
    animation: 'Pulse'
  };
  public animationEffects: AnimationEffect[] = ['Pulse', 'Wave', 'Strobe', 'Mix'];

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
    console.log('call preset function arg:', preset)
    this.presetService.emitPreset(preset);
    this.location.back();
  }

  changeSpeed(event) {
    this.currentValue.speed = event.detail.value;
  }

  changeAnimation(animation) {
    this.preset = this.presetService.presets[0]
    this.currentValue.animation = animation
    this.presetService.emitPreset(this.preset);
    this.location.back();
  }
}

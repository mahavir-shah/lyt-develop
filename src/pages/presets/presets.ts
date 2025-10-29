import { Component } from '@angular/core';
import { Location } from '@angular/common';

import { PresetsService, Preset } from '../../shared/services/presets.service';

@Component({
  selector: 'presets',
  templateUrl: 'presets.html',
  standalone: false,
})
export class PresetsPage {
  // public onPresetSelect: Function;

  constructor(
    public location: Location,
    public presetService: PresetsService,
  ) {
  }


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
}

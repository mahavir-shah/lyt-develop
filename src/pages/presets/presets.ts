import { Component } from '@angular/core';
import { Location } from '@angular/common';

import { PresetsService, Preset } from '../../shared/services/presets.service';

@Component({
  selector: 'presets',
  templateUrl: 'presets.html',
  standalone: false,
})
export class PresetsPage {
  private onPresetSelect: Function;

  constructor(
    private location: Location,
    public presetService: PresetsService,
  ) {
  }


  ngOnInit() {
    this.presetService.presetSelected$.subscribe(preset => {
      this.onPresetSelect = preset;
    });
  }


  public activatePreset(preset: Preset): void {
    this.onPresetSelect(preset);
    this.location.back();
  }
}

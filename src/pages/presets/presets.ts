// presets.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Location } from '@angular/common';
import { PresetsService, Preset, AnimationType } from '../../shared/services/presets.service';
import { Color } from 'src/shared/components/color-wheel/color';
import { DevicesService } from 'src/shared/services/devices.service';
import { Subscription } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { NavController, Platform } from '@ionic/angular';

export type AnimationEffect = 'pulse' | 'wave' | 'strobe' | 'mix' | 'patagonian' | 'kalahari' | 'chalbi' | 'thar';

@Component({
  selector: 'presets',
  templateUrl: 'presets.html',
  styleUrl: 'presets.scss',
  standalone: false,
})
export class PresetsPage implements OnInit, OnDestroy {
  public preset: Preset;
  public currentValue: any;
  public animationEffects: AnimationEffect[] = ['pulse', 'wave', 'strobe', 'mix', 'patagonian', 'kalahari', 'chalbi', 'thar'];
  public lastActiveColor: Color | null;
  private activeColorSub: Subscription | null = null;
  public enableArmsMode: boolean = true;
  private armsAnimations = ['patagonian', 'kalahari', 'chalbi', 'thar'];
  private colorAnimations = ['pulse', 'wave', 'strobe', 'mix'];

  /** NEW: cancellation flag for iOS */
  private isCancelling: boolean = false;
  /** NEW: platform detection */
  private readonly isIOS = Capacitor.getPlatform() === 'ios';

  private presetBackButtonSubscription?: Subscription;

  constructor(
    public location: Location,
    public presetService: PresetsService,
    public deviceService: DevicesService,
    public platform: Platform,
    public navCtrl: NavController,
  ) {
    this.lastActiveColor = this.deviceService?.connectedDevice?.color || null;

    this.currentValue = {
      speedPercent: 50,
      brightnessPercent: 100,   // <-- NEW
      presetStatus: false,
      animation: 'pulse',
      activeColor: null
    };

    this.currentValue.speed = this.convertPercentToMs(this.currentValue.speedPercent);
    this.deviceService.currentPresetValue = {
      speedPercent: this.currentValue.speedPercent,
      speed: this.currentValue.speed
    };

    // subscribe to active color broadcasts so UI highlights reflect actual animated color
    this.activeColorSub = this.presetService.activeColor$.subscribe(hex => {
      this.currentValue.activeColor = hex;
    });
  }

  ngOnInit() {
    this.setupHardwareBackButton();
  }

  private setupHardwareBackButton(): void {
    // Priority 9999 ensures this runs before other handlers
    this.presetBackButtonSubscription = this.platform.backButton.subscribeWithPriority(9999, async () => {
      if (this.presetBackButtonSubscription) this.presetBackButtonSubscription.unsubscribe();
      this.navCtrl.navigateRoot('/color-picker-page');
    });
  }

  ngOnDestroy() {
    if (this.presetBackButtonSubscription) this.presetBackButtonSubscription.unsubscribe();

    if (this.activeColorSub) {
      this.activeColorSub.unsubscribe();
      this.activeColorSub = null;
    }
    // persist slider state
    this.deviceService.currentPresetValue = this.currentValue;
  }

  onArmsModeChanged() {
    // if no restore color, send a null activeColor signal to clear highlight
    this.presetService.emitPreset({
      animation: null,
      speed: null,
      iosCancel: this.isIOS ? true : false,
      brightness: null
    });

    // Reset speed to max when toggling modes
    this.currentValue.speedPercent = 50;
    this.onSpeedChanged();

    if (this.enableArmsMode) {
      // switch to default arms mode animation
      this.currentValue.animation = 'patagonian';
    } else {
      // switch to default color mode animation
      this.currentValue.animation = 'pulse';
    }
  }

  onBrightnessChanged() {
    this.presetService.updateBrightness(this.currentValue.brightnessPercent);
  }

  // Convert % → ms
  private convertPercentToMs(percent: number): number {
    const minMs = 20000; // slowest
    const maxMs = 0;  // fastest
    return Math.round(minMs - (percent / 100) * (minMs - maxMs));
  }

  /**
   * Called when user drags the speed slider
   * Immediately updates the running animation speed
   */
  onSpeedChanged() {
    let durationMs = 0;

    if (this.enableArmsMode) {
      durationMs = this.mapSpeedToDurationArmsMode(this.currentValue.speedPercent);
    } else {
      durationMs = this.mapSpeedToDurationColorMode(this.currentValue.speedPercent);
      // Notify color-picker only about the speed — no preset restart
      //this.presetService.setSpeed(durationMs);
    }
    // Convert percent to milliseconds
    this.currentValue.speed = durationMs;

    // If animation is currently running, restart it with new speed
    if (this.currentValue.presetStatus && this.currentValue.animation) {
      this.restartAnimationWithNewSpeed();
    }
  }

  /**
   * Restart the current animation with new speed
   * This provides immediate feedback when user adjusts the slider
   */
  private restartAnimationWithNewSpeed() {
    const preset = this.presetService.presets[0];
    if (!preset || !preset.colors || preset.colors.length === 0) return;

    // Re-emit the preset with updated speed
    this.presetService.emitPreset({
      colors: preset.colors.slice(),
      animation: (this.currentValue.animation as AnimationType),
      speed: this.currentValue.speed,
      brightness: this.currentValue.brightnessPercent
    });
  }

  formatPercentPin(v: number) {
    return v + '%';
  }

  // Activate preset: static selection (first color)
  public activatePreset(preset: Preset): void {
    const first = preset.colors && preset.colors.length ? preset.colors[0] : null;
    if (!first) return;

    this.presetService.emitPreset({
      color: first,
      animation: null,
      speed: null,
      brightness: null
    });

    // update UI state
    this.currentValue.presetStatus = false;
    this.currentValue.activeColor = first.getHexCode();

    this.location.back();
  }

  // START rotation + animation across the preset colors
  public changeAnimation(animation: AnimationEffect) {
    if (this.enableArmsMode) {
      if (!this.armsAnimations.includes(animation)) return;
    } else {
      if (!this.colorAnimations.includes(animation)) return;
    }
    // pick the palette (first preset) - adjust as you need
    this.preset = this.presetService.presets[0];
    if (!this.preset || !this.preset.colors || this.preset.colors.length === 0) return;

    /** Reset cancelling before animation starts */
    this.isCancelling = false;

    this.currentValue.presetStatus = true;
    this.currentValue.animation = animation;
    this.currentValue.activeColor = this.preset.colors[0].getHexCode();

    this.presetService.emitPreset({
      colors: this.preset.colors.slice(), // pass the array
      animation: (animation as AnimationType),
      speed: this.currentValue.speed,
      brightness: this.currentValue.brightnessPercent
    });
  }

  /** STOP animation instantly on Cancel */
  public deactivatePreset() {
    this.isCancelling = true;   // NEW: instantly stop any pending writes
    const restoreColor = this.lastActiveColor;
    /** 
     * iOS FIX:
     * Do NOT wait for queued BLE writes to finish.
     * Immediately send a STOP signal without awaiting anything.
     */
    if (restoreColor) {
      this.presetService.emitPreset({
        color: restoreColor,
        animation: null,
        speed: null,
        /** NEW: iOS override — kill animation immediately */
        iosCancel: this.isIOS ? true : false,
        brightness: null
      });

      // ensure UI highlight cleared/restored
      this.presetService.updateActiveColor(restoreColor.getHexCode());
      this.currentValue.activeColor = restoreColor.getHexCode();
    } else {
      // if no restore color, send a null activeColor signal to clear highlight
      this.presetService.emitPreset({
        animation: null,
        speed: null,
        iosCancel: this.isIOS ? true : false,
        brightness: null
      });

      this.presetService.updateActiveColor(null);
      this.currentValue.activeColor = null;
    }

    this.currentValue = {
      speedPercent: this.currentValue.speedPercent,
      speed: this.currentValue.speed,
      animation: this.enableArmsMode ? 'patagonian': 'pulse',
      presetStatus: false,
      activeColor: null,
      brightnessPercent: this.currentValue.brightnessPercent
    };
  }

  private mapSpeedToDurationArmsMode(percent: number): number {
    const min = 2000;   // 2 seconds
    const max = 10000;  // 10 seconds
    return min + (max - min) * (100 - percent) / 100;
  }

  private mapSpeedToDurationColorMode(percent: number): number {
    const min = 350;   // 350 ms
    const max = 2350;  // 2350 ms
    return min + (max - min) * (100 - percent) / 100;
  }

}

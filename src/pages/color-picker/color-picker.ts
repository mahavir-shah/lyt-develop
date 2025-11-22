// color-picker.ts (updated - master controller)
// This file remains the orchestrator: UI handlers, back-button, preset subscription, brightness/saturation and uses AnimationEngine + BleWriter + Presets logic.

import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Platform, NavController, AlertController } from '@ionic/angular';
import { Subscription } from 'rxjs';

import { ColorWheel } from '../../shared/components/color-wheel/color-wheel';
import { Color } from '../../shared/components/color-wheel/color';
import { Device } from '../../shared/models/device.model';
import { PresetsService, PresetEmitPayload } from '../../shared/services/presets.service';
import { DevicesService } from '../../shared/services/devices.service';

// new imports (modules created)
import { BleWriter } from '../../shared/core/ble/ble-writer';
import { AnimationEngine } from '../../shared/core/animations/animation-engine';

enum SliderType {
  left,
  right
}

@Component({
  selector: 'color-picker',
  templateUrl: 'color-picker.html',
  styleUrl: 'color-picker.scss',
  standalone: false,
})
export class ColorPickerPage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(ColorWheel) colorWheel!: ColorWheel;

  // Colors
  public color: Color;
  public adjustedColor: Color;

  // Brightness / Saturation UI
  public brightnessLevel: number = 100;
  public saturationLevel: number = 100;

  // Device & UI
  public connectedDevice: Device;
  public bottomColorCircle: HTMLElement | null = null;

  public isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  // UI state used by presets page (active circle highlight)
  public currentValue: any = {
    presetStatus: false,
    animation: null,
    activeColor: null,
    speed: 1000,
    brightness: 100
  };

  // modules
  private bleWriter!: BleWriter;
  private animationEngine!: AnimationEngine;

  // Subscriptions
  private presetSubscription?: Subscription;
  private brightnessSubscription?: Subscription;
  private backButtonSubscription?: Subscription;
  private speedSubscription?: Subscription;

  constructor(
    public devicesService: DevicesService,
    public platform: Platform,
    public navCtrl: NavController,
    public presetService: PresetsService,
    private alertController: AlertController
  ) {
    this.connectedDevice = this.devicesService.connectedDevice;
    this.color = this.connectedDevice?.color || new Color(255, 0, 0);
    this.adjustedColor = this.connectedDevice?.color || new Color(255, 0, 0);
  }

  ngOnInit() {
    // instantiate modules
    this.bleWriter = new BleWriter(this.connectedDevice, this.isiOS);
    this.animationEngine = new AnimationEngine(this.bleWriter);

    this.speedSubscription = this.presetService.speed$.subscribe(newSpeed => {
      this.animationEngine.updateSpeed(newSpeed);
      this.bleWriter.setBleWriteInterval(newSpeed);
      this.adjustRotationTimeoutForNewSpeed(newSpeed);  // if you implemented it
    });

    // subscribe to brightness updates (from presets UI)
    this.brightnessSubscription = this.presetService.brightnessSelected$.subscribe(
      async (value: number | null) => {
        if (value != null) {
          this.currentValue.brightness = value;
          // forward to animation engine for multi-arm presets
          try { this.animationEngine.updateBrightness && this.animationEngine.updateBrightness(value); } catch (_) { }
        }
      }
    );

    // preset selection handler
    this.presetSubscription = this.presetService.presetSelected$.subscribe(async (payload: PresetEmitPayload) => {
      // stop any existing animation immediately (hard stop)
      await this.stopAll(true);

      // rotation/animation with colors
      if (payload?.colors && payload.colors.length && payload.animation) {
        this.currentValue.presetStatus = true;
        this.currentValue.animation = payload.animation;
        this.currentValue.speed = Math.max(50, Math.round(payload.speed || 1000));
        this.currentValue.brightness = payload.brightness ?? this.currentValue.brightness;

        const anim = (payload.animation || '').toLowerCase();

        // Set BLE write rate to be consistent with speed — BleWriter has internal throttling, but set interval to speed value
        try { this.bleWriter.setBleWriteInterval && this.bleWriter.setBleWriteInterval(this.currentValue.speed); } catch (_) { }

        if (['patagonian', 'kalahari', 'chalbi', 'thar'].includes(anim)) {
          // multi-arm preset using AnimationEngine
          this.animationEngine.startMultiArm(
            anim,
            payload.colors[0],
            this.currentValue.speed,
            this.currentValue.brightness,
            (arms) => {
              // update UI preview with first arm
              if (this.bottomColorCircle && arms && arms.length) {
                try { this.bottomColorCircle.style.backgroundColor = arms[0].getHexCode(); } catch (_) { }
              }
              this.currentValue.activeColor = arms && arms.length ? arms[0].getHexCode() : null;
              this.presetService.updateActiveColor(this.currentValue.activeColor);
            }
          );
        } else {
          // single-strip existing effects (pulse/wave/strobe/mix) via AnimationEngine
          this.ensureNoDoubleRotation();
          this.startColorRotation(payload.colors, payload.animation, this.currentValue.speed);
        }

        return;
      }

      // If payload is a single static color -> just write color (stop animations)
      if (payload?.color) {
        this.currentValue.presetStatus = false;
        this.currentValue.animation = null;
        this.currentValue.activeColor = payload.color.getHexCode();

        this.presetService.updateActiveColor(payload.color.getHexCode());

        try {
          await this.connectedDevice.writeColor(payload.color);
        } catch (e) {
          console.warn('Static color write failed', e);
        }
      }
    });

    // optional: handle clear effect subscription
    this.presetService.clearColorPickerBackEffect$.subscribe(async (payload: boolean) => {
      if (this.backButtonSubscription) this.backButtonSubscription.unsubscribe();
    });
  }

  ngAfterViewInit() {
    this.bottomColorCircle = document.getElementById('bottom-color-circle');
    if (this.bottomColorCircle && this.adjustedColor) {
      try { this.bottomColorCircle.style.backgroundColor = this.adjustedColor.getHexCode(); } catch (_) { }
    }
  }

  ionViewWillEnter() {
    if (this.backButtonSubscription) this.backButtonSubscription.unsubscribe();
    this.setupHardwareBackButton();
  }

  private setupHardwareBackButton(): void {
    // Priority 9999 ensures this runs before other handlers
    this.backButtonSubscription = this.platform.backButton.subscribeWithPriority(9999, async () => {
      const canLeave = await this.showDisconnectAlert();
      if (canLeave) {
        try {
          await this.stopAll(true);
          await this.connectedDevice.disconnect();
          if (this.backButtonSubscription) this.backButtonSubscription.unsubscribe();
          this.navCtrl.navigateRoot('/search-inprogress-page');
        } catch (error) {
          console.error('Error while disconnecting', error);
        }
      }
      // If !canLeave, prevent default back behavior by doing nothing
    });
  }

  private async showDisconnectAlert(): Promise<boolean> {
    return new Promise(async (resolve) => {
      const alert = await this.alertController.create({
        header: 'Disconnect Device',
        cssClass: 'custom-color-alert',
        message: 'Are you sure you want to go back?',
        backdropDismiss: false,
        buttons: [
          { text: 'Yes', role: 'confirm', handler: () => resolve(true) },
          { text: 'No', role: 'cancel', handler: () => resolve(false) }
        ]
      });
      await alert.present();
    });
  }

  ngOnDestroy() {
    // ensure final cleanup
    this.stopAll(true);
    if (this.brightnessSubscription) this.brightnessSubscription.unsubscribe();
    if (this.backButtonSubscription) this.backButtonSubscription.unsubscribe();
    if (this.presetSubscription) this.presetSubscription.unsubscribe();
  }

  // STOP / HARD CANCEL - delegate to AnimationEngine + BleWriter
  private async stopAll(hard: boolean = false) {
    // Stop animation engine (which will call bleWriter.stopAllWrites when hard)
    try {
      this.stopColorRotation();
      this.animationEngine.stop(hard);
    } catch (e) {
      console.warn('[MASTER] animationEngine stop error', e);
    }

    // ensure BLE writer is stopped/hard-cancelled
    try {
      this.bleWriter.stopAllWrites(hard);
    } catch (e) {
      console.warn('[MASTER] bleWriter stopAllWrites error', e);
    }

    // Reset UI state
    this.currentValue.presetStatus = false;
    this.currentValue.animation = null;
    this.currentValue.activeColor = null;
    this.presetService.updateActiveColor(null);

    // small tick to allow async cancellations to settle
    await new Promise(res => setTimeout(res, 30));
  }

  // ------------------------ COLOR ROTATION LOOP (single-strip presets) ------------------------
  private isRotating: boolean = false;
  private rotationTimeout: any = null;
  private lastRotationTickStart: number = 0; // timestamp when current color started

  private async startColorRotation(colors: Color[], effect: string, speedMs: number) {
    this.isRotating = true;
    let index = 0;
    this.rotationColors = colors;
    this.rotationIndex = 0;

    const rotate = () => {
      if (!this.isRotating) return;

      const baseColor = this.rotationColors[this.rotationIndex % this.rotationColors.length];
      // record when this color slot started
      this.lastRotationTickStart = performance.now();

      // Start animation for the current color
      this.animationEngine.startSingleStrip(
        effect as any,
        baseColor,
        speedMs,
        (frameColor) => {
          if (this.bottomColorCircle) {
            this.bottomColorCircle.style.backgroundColor = frameColor.getHexCode();
          }
          this.currentValue.activeColor = frameColor.getHexCode();
          this.presetService.updateActiveColor(frameColor.getHexCode());
        }
      );

      this.rotationIndex++;

      // Schedule next color after speed duration
      this.rotationTimeout = setTimeout(rotate, speedMs);
    };

    rotate();
  }

  // ------------------------ Safety Guards & Logging ------------------------

  private log(msg: string, ...args: any[]) {
    console.log(`[ColorPicker] ${msg}`, ...args);
  }

  private ensureNoDoubleRotation() {
    if (this.isRotating) {
      this.log('Prevented double rotation loop');
      this.stopColorRotation();
    }
  }

  // ------------------------ Rotation Stop ------------------------

  private stopColorRotation() {
    this.isRotating = false;
    if (this.rotationTimeout) clearTimeout(this.rotationTimeout);
    this.rotationTimeout = null;
  }

  // ------------------------ Helpers & UI actions ------------------------

  public changeDeviceColor() {
    // stop animations, then apply wheel color
    this.stopAll(true);
    setTimeout(() => {
      this.changeColor();
      this.brightnessLevel = 100;
      this.saturationLevel = 100;
      this.updateBrightnessDots(100);
      this.updateSaturationDots(100);
    }, 150);
  }

  public changeColor() {
    this.stopAll(true);
    try { this.connectedDevice.writeColor(this.adjustedColor); } catch (e) { console.warn('changeColor write failed', e); }
    this.presetService.updateActiveColor(this.adjustedColor.getHexCode());
  }

  public setColor(color: Color) {
    this.stopAll(true);
    this.color = color;
    this.adjustedColor = this.getAdjustedColor();
    try { this.colorWheel.setColor(this.adjustedColor); } catch (_) { }
    if (this.bottomColorCircle) try { this.bottomColorCircle.style.backgroundColor = this.adjustedColor.getHexCode(); } catch (_) { }
  }

  public setBrightnessLevel(level: number) {
    this.stopAll(true);
    this.brightnessLevel = level;
    this.updateSliderOfType(SliderType.left);

    if (this.saturationLevel === 100) {
      try { this.connectedDevice.setLedBrightness(level, this.adjustedColor); } catch (_) { }
    } else {
      try { this.connectedDevice.applyBrightnessAndSaturation(this.adjustedColor, this.brightnessLevel, this.saturationLevel); } catch (_) { }
    }
  }

  public setSaturationLevel(level: number) {
    this.stopAll(true);
    this.saturationLevel = level;
    this.updateSliderOfType(SliderType.right);
    this.adjustedColor = this.getAdjustedColor();

    if (this.brightnessLevel === 100) {
      try { this.connectedDevice.setSaturationLevel(level, this.adjustedColor); } catch (_) { }
    } else {
      try { this.connectedDevice.applyBrightnessAndSaturation(this.adjustedColor, this.brightnessLevel, this.saturationLevel); } catch (_) { }
    }

    if (this.bottomColorCircle) try { this.bottomColorCircle.style.backgroundColor = this.adjustedColor.getHexCode(); } catch (_) { }
  }

  private getAdjustedColor(): Color {
    return this.color.desaturated(this.saturationLevel);
  }

  private updateSliderOfType(type: SliderType) {
    const val = type === SliderType.left ? this.brightnessLevel : this.saturationLevel;
    const idx = Math.max(1, Math.min(10, Math.round(val / 10)));
    const prefix = type === SliderType.left ? 'left' : 'right';

    for (let i = 1; i <= 10; i++) {
      const dot = document.getElementById(`${prefix}-slider-dot-${i}`);
      if (!dot) continue;
      dot.classList.toggle('active', i === idx);
    }
  }

  private updateBrightnessDots(level: number) {
    for (let i = 1; i <= 10; i++) {
      const dot = document.getElementById(`left-slider-dot-${i}`);
      if (!dot) continue;
      dot.classList.toggle('active', i === Math.round(level / 10));
    }
  }

  private updateSaturationDots(level: number) {
    for (let i = 1; i <= 10; i++) {
      const dot = document.getElementById(`right-slider-dot-${i}`);
      if (!dot) continue;
      dot.classList.toggle('active', i === Math.round(level / 10));
    }
  }

  public flash() {
    this.stopAll(true);
    if (this.connectedDevice && (this.connectedDevice as any).flash) {
      try { (this.connectedDevice as any).flash(this.brightnessLevel); } catch (_) { }
    }
  }

  public async disconnect() {
    this.stopAll(true);
    const alert = await this.alertController.create({
      header: 'Disconnect Device',
      cssClass: 'custom-color-alert',
      message: 'Are you want to sure for disconnect device ?',
      buttons: [
        {
          text: 'Yes',
          role: 'confirm',
          cssClass: 'primary-button',
          handler: () => {
            this.stopAll(true);
            this.connectedDevice.disconnect().then(() => {
              if (this.backButtonSubscription) this.backButtonSubscription.unsubscribe();
              this.navCtrl.navigateRoot('/search-inprogress-page');
            });
          }
        },
        {
          text: 'No',
          role: 'cancel',
          cssClass: 'primary-button'
        }
      ]
    });
    await alert.present();
  }

  public goToPresetsPage() {
    if (this.backButtonSubscription) this.backButtonSubscription.unsubscribe();
    this.navCtrl.navigateForward('/presets-page');
  }

  public goToDebugPage() {
    if (this.backButtonSubscription) this.backButtonSubscription.unsubscribe();
    this.navCtrl.navigateForward('/debug-page');
  }

  public async deactivatePreset() {
    await this.stopAll(true);
    const restore = this.connectedDevice?.color;
    if (restore) {
      try { this.connectedDevice.writeColor(restore); } catch (_) { }
      this.currentValue.activeColor = restore.getHexCode();
      this.presetService.updateActiveColor(restore.getHexCode());
    } else {
      this.presetService.updateActiveColor(null);
      this.currentValue.activeColor = null;
    }
  }

  // public onSpeedChanged() {
  //   // convert percent to milliseconds depending on Arms mode rules you mentioned earlier
  //   const newMs = this.speedPercentToMs(this.currentValue.speedPercent);
  //   // Update UI state
  //   this.currentValue.speed = newMs;

  //   // 1) Update engine speed live (no restart)
  //   try { this.animationEngine.updateSpeed(newMs); } catch (e) { console.warn('updateSpeed failed', e); }

  //   // 2) Update BLE writer interval live
  //   try { this.bleWriter.setBleWriteInterval(newMs); } catch (e) { console.warn('ble writer interval update failed', e); }

  //   // 3) Adjust rotation timeout so next color uses the new speed without restarting current animation
  //   this.adjustRotationTimeoutForNewSpeed(newMs);
  // }

  private adjustRotationTimeoutForNewSpeed(newMs: number) {
    if (!this.isRotating || !this.rotationTimeout) {
      // nothing scheduled — next rotation will use updated currentValue.speed
      return;
    }

    // compute elapsed time since the current color started
    const now = performance.now();
    const elapsed = now - (this.lastRotationTickStart || now);
    const remaining = Math.max(0, newMs - elapsed);

    // clear current timeout and schedule next rotate after `remaining`
    clearTimeout(this.rotationTimeout);
    this.rotationTimeout = setTimeout(() => {
      // directly call rotate function — easiest is to call startColorRotation's internal rotate,
      // but since rotate is local, we emulate by calling stop and triggering next cycle:
      // simplest approach: call stopColorRotation(), then start next rotation step immediately
      // to avoid restarting the per-frame engine we only need to call the next rotate action:
      // however to keep minimal changes we will schedule the next call which will pick the next color/slot
      // the animationEngine is still animating the current color and will continue until its internal duration passes.
      // So simply calling the outer rotate by using the same logic as startColorRotation would work.
      // Implementation detail: if you've encapsulated rotate as private, call a public method to advance rotation.
      // For this patch, we'll call `this.advanceRotationOnce()` which you should implement to perform one step.
      this.advanceRotationOnce();
    }, remaining);
  }

  private rotationIndex?: number = 0; // not used for singleStrip, kept if needed
  private rotationColors: Color[] = [];

  private advanceRotationOnce() {
    // Stop the current single-strip per-color animation cleanly WITHOUT touching the engine RAF
    // We'll let the engine continue animating the next base color by calling startSingleStrip for the next color.
    // Implementation depends on how you manage index. If your rotate() captured index as closure, refactor to store index in class.
    // Example implementation assuming you store `rotationIndex` and `rotationColors`:

    if (!this.rotationColors || this.rotationColors.length === 0) return;

    // pick next
    this.rotationIndex = (this.rotationIndex + 1) % this.rotationColors.length;
    const nextBase = this.rotationColors[this.rotationIndex];

    // update lastRotationTickStart
    this.lastRotationTickStart = performance.now();

    // start single-strip for nextBase; engine is not restarted globally, only startSingleStrip for new base
    this.animationEngine.startSingleStrip(
      this.currentValue.animation,
      nextBase,
      this.currentValue.speed,
      (frameColor) => {
        if (this.bottomColorCircle) this.bottomColorCircle.style.backgroundColor = frameColor.getHexCode();
        this.currentValue.activeColor = frameColor.getHexCode();
        this.presetService.updateActiveColor(frameColor.getHexCode());
      }
    );

    // schedule next rotation using updated speed
    if (this.rotationTimeout) clearTimeout(this.rotationTimeout);
    this.rotationTimeout = setTimeout(() => this.advanceRotationOnce(), this.currentValue.speed);
  }
}

// color-picker.ts
import { AfterViewInit, Component, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Platform, NavController } from '@ionic/angular';

import { ColorWheel } from '../../shared/components/color-wheel/color-wheel';
import { Color } from '../../shared/components/color-wheel/color';

import { Device } from '../../shared/models/device.model';
import { PresetsService, PresetEmitPayload } from '../../shared/services/presets.service';
import { DevicesService } from '../../shared/services/devices.service';
import { AlertController } from '@ionic/angular';
import { Subscription } from 'rxjs';

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
  @ViewChild(ColorWheel) colorWheel: ColorWheel;

  public color: Color;
  public adjustedColor: Color;

  public brightnessLevel: number = 100;
  public saturationLevel: number = 100;

  public connectedDevice: Device;
  public bottomColorCircle: HTMLElement | null = null;

  public isiOS = false;

  /** HARD CANCEL REQUIREMENT:
   * Resettable write queue for iOS so Cancel instantly cancels pending writes.
   */
  private writeQueue: Promise<void> = Promise.resolve();
  private queueCanceled = false;   // <-- NEW FLAG

  // UI state
  public currentValue: any = {
    presetStatus: false,
    animation: null,
    activeColor: null,
    speed: 1000
  };

  // rotation/animation control
  private rotationAbortController: AbortController | null = null;
  private cycleAbortController: AbortController | null = null;
  private presetSubscription: any = null;

  private lastBleWriteAt = 0;
  private bleWriteInterval = 50;

  // RAF / timeout IDs to ensure complete cleanup
  private rafId: number | null = null;
  private fallbackTimeoutId: any = null;

  // NEW: Track if we're actively animating
  private isAnimating = false;

  private backButtonSubscription: Subscription | undefined;

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
    this.isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  }

  ngOnInit() {
    this.presetSubscription = this.presetService.presetSelected$.subscribe(async (payload: PresetEmitPayload) => {
      // Stop any existing rotation/animation first
      await this.stopAll();

      // If payload contains colors (rotation request), start rotating
      if (payload?.colors && payload.colors.length > 0 && payload.animation) {
        this.currentValue.presetStatus = true;
        this.currentValue.animation = payload.animation;
        this.currentValue.speed = Math.max(50, Math.round(payload.speed || 1000));

        this.startRotation(payload.colors, payload.animation, this.currentValue.speed);
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

    this.setupBackButtonHandler();
  }

  ngAfterViewInit() {
    this.bottomColorCircle = document.getElementById('bottom-color-circle');
    if (this.bottomColorCircle && this.adjustedColor) {
      this.bottomColorCircle.style.backgroundColor = this.adjustedColor.getHexCode();
    }
  }

  ngOnDestroy() {
    this.stopAll();
    if (this.presetSubscription) {
      this.presetSubscription.unsubscribe();
    }

    if (this.backButtonSubscription) {
      this.backButtonSubscription.unsubscribe();
    }
  }

// ------------------------ HARD CANCEL CORE ------------------------

  /** 
   * HARD CANCEL BEHAVIOR:
   *  - Immediately abort rotation & animation
   *  - Instantly clear RAF + timeouts
   *  - Instantly reset iOS writeQueue (no waiting)
   *  - Prevent ANY pending write from sending
   */
  private async stopAll(hard: boolean = false) {
    this.isAnimating = false;

    if (this.rotationAbortController) {
      try { this.rotationAbortController.abort(); } catch (_) { }
      this.rotationAbortController = null;
    }

    if (this.cycleAbortController) {
      try { this.cycleAbortController.abort(); } catch (_) { }
      this.cycleAbortController = null;
    }

    this.clearTimers();

    if (hard && this.isiOS) {
      /** HARD CANCEL FIX:
       * Cancel all queued writes IMMEDIATELY — do not wait for BLE to finish.
       */
      this.queueCanceled = true;
      this.writeQueue = Promise.resolve();
    }

    this.lastBleWriteAt = 0;
    this.currentValue.presetStatus = false;
    this.currentValue.animation = null;
    this.currentValue.activeColor = null;

    this.presetService.updateActiveColor(null);

    // minimal tick
    await new Promise(res => setTimeout(res, 10));
  }

  private clearTimers() {
    if (this.rafId != null) cancelAnimationFrame(this.rafId);
    this.rafId = null;

    if (this.fallbackTimeoutId != null) clearTimeout(this.fallbackTimeoutId);
    this.fallbackTimeoutId = null;
  }

  private setupBackButtonHandler() {
    if (this.backButtonSubscription) {
        this.backButtonSubscription.unsubscribe();
    }

    this.backButtonSubscription = this.platform.backButton.subscribeWithPriority(99, async () => { 
      // Adjusted priority from 100 to 99
      const alert = await this.alertController.create({
        header: 'Disconnect Device',
        cssClass: 'custom-color-alert',
        message: 'Are you sure you want to go back? It will disconnect the device.', // Corrected grammar slightly
        buttons: [
          { 
            text: 'Yes', 
            role: 'confirm', 
            cssClass: 'primary-button',
            handler: () => {
              this.stopAll(true);
              // Ensure that this.connectedDevice is initialized and accessible
              this.connectedDevice.disconnect().then(() => {
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
    });
  }

  // ------------------------ Rotation orchestration ------------------------

  private startRotation(colors: Color[], animation: string, speedMs: number) {
    // Each color animates for the FULL speed duration
    // Total cycle time = colors.length × speedMs
    // Example: 15 colors × 1000ms = 15 seconds for full cycle
    const perColorDuration = Math.max(50, Math.round(speedMs));
    
    this.rotationAbortController = new AbortController();
    const signal = this.rotationAbortController.signal;

    this.setBleWriteRate(perColorDuration);
    this.isAnimating = true;

    (async () => {
      let idx = 0;
      while (!signal.aborted && this.isAnimating) {
        const base = colors[idx % colors.length];

        // Update UI to highlight current color (shows in presets.html)
        this.presetService.updateActiveColor(base.getHexCode());
        this.currentValue.activeColor = base.getHexCode();

        if (this.cycleAbortController) {
          try { this.cycleAbortController.abort(); } catch (_) {}
          this.cycleAbortController = null;
        }

        this.cycleAbortController = new AbortController();

        try {
          // Run selected animation (pulse/wave/strobe/mix) on LED
          // for this color for the full speed duration
          await this.runSingleCycle(
            animation as 'pulse'|'wave'|'strobe'|'mix', 
            base, 
            perColorDuration,
            this.cycleAbortController.signal
          );
        } catch (err) {
          if ((err as any)?.name === 'AbortError') break;
          console.warn('Cycle error', err);
        } finally {
          this.cycleAbortController = null;
        }

        // Move to next color
        idx++;
      }

      this.isAnimating = false;
      await this.stopAll(true);
    })();
  }

  // ------------------------ Single-cycle animation ------------------------

  private runSingleCycle(
    effect: 'pulse' | 'wave' | 'strobe' | 'mix',
    baseColor: Color,
    durationMs: number,
    abortSignal: AbortSignal
  ): Promise<void> {
    // Animates ONE color on the LED using the selected effect
    // for the specified duration (e.g., 1000ms)
    // 
    // During this time:
    // - UI shows this color highlighted (handled by startRotation)
    // - LED displays the animation effect (pulse/wave/strobe/mix)
    // - Color values transition based on the effect's math
    
    return new Promise<void>((resolve, reject) => {
      const start = performance.now();

      const step = () => {
        // CRITICAL: Check abort signal AND isAnimating flag
        if (abortSignal.aborted || !this.isAnimating) {
          this.clearTimers();
          reject(new DOMException('Aborted', 'AbortError'));
          return;
        }

        const now = performance.now();
        const elapsed = now - start;
        const t = Math.min(1, elapsed / durationMs); // Progress: 0.0 to 1.0

        // Calculate color for current frame based on animation effect
        const frameColor = this.computeAnimationColor(effect, baseColor, t);

        // Update UI preview (bottom circle in color-picker.html)
        if (this.bottomColorCircle) {
          try { 
            this.bottomColorCircle.style.backgroundColor = frameColor.getHexCode(); 
          } catch (_) {}
        }

        // Throttle BLE writes to avoid overwhelming device
        if (now - this.lastBleWriteAt >= this.bleWriteInterval) {
          this.lastBleWriteAt = now;
          this.enqueueBleWrite(frameColor.r, frameColor.g, frameColor.b);
        }

        // Check if cycle complete
        if (elapsed >= durationMs) {
          this.clearTimers();
          resolve();
          return;
        }
        // Schedule next frame (60fps via RAF)
        if (this.isiOS) {
          this.fallbackTimeoutId = setTimeout(step, this.bleWriteInterval);
        } else {
          this.rafId = requestAnimationFrame(step);
        }
      };

      // Start animation
      if (typeof requestAnimationFrame === 'function') {
        this.rafId = requestAnimationFrame(step);
      } else {
        this.fallbackTimeoutId = setTimeout(step, 16);
      }
    });
  }

  // ------------------------ HARD CANCEL WRITE QUEUE ------------------------

  private enqueueBleWrite(r: number, g: number, b: number): Promise<void> {
    if (!this.isiOS) {
      return this.connectedDevice.writeRGBColorWithoutResponse(r, g, b);
    }

    if (this.queueCanceled) {
      return Promise.resolve();   // <-- HARD CANCEL: ignore all queued writes
    }

    this.writeQueue = this.writeQueue.then(() => {

      if (this.queueCanceled)  return Promise.resolve();   // HARD CANCEL: ignore writes

      return this.connectedDevice.writeRGBColorWithoutResponse(r, g, b)
        .then(() => new Promise(res => setTimeout(res, 25)));
    });

    return this.writeQueue;
  }

  // ------------------------ Animation math (unchanged) ------------------------

  private computeAnimationColor(effect: string, base: Color, t: number): Color {
    switch (effect) {
      case 'pulse': return this.pulseColor(base, t);
      case 'wave': return this.waveColor(base, t);
      case 'strobe': return this.strobeColor(base, t);
      case 'mix': return this.mixColor(base, t);
      default: return base;
    }
  }

  private pulseColor(base: Color, t: number): Color {
    const b = 0.5 * (1 - Math.cos(2 * Math.PI * t));
    return new Color(Math.round(base.r * b), Math.round(base.g * b), Math.round(base.b * b));
  }

  private waveColor(base: Color, t: number): Color {
    const b = (Math.sin(2 * Math.PI * t - Math.PI / 2) + 1) / 2;
    const scaled = Math.pow(b, 1.05);
    return new Color(Math.round(base.r * scaled), Math.round(base.g * scaled), Math.round(base.b * scaled));
  }

  private strobeColor(base: Color, t: number): Color {
    return t <= 0.2 ? base : new Color(0, 0, 0);
  }

  private mixColor(base: Color, t: number): Color {
    const part = t * 3;
    const idx = Math.floor(part);
    const local = part - idx;
    switch (idx) {
      case 0: return this.pulseColor(base, local);
      case 1: return this.waveColor(base, local);
      default: return this.strobeColor(base, local);
    }
  }

  // ------------------------ UI / Other Methods (unchanged except stopAll integration) ------------------------

  private setBleWriteRate(duration: number) {
    if (this.isiOS) {
      this.bleWriteInterval = 180;
      return;
    }

    if (duration <= 300) this.bleWriteInterval = 30;
    else if (duration <= 600) this.bleWriteInterval = 40;
    else if (duration <= 1200) this.bleWriteInterval = 50;
    else this.bleWriteInterval = 80;
  }

  public changeDeviceColor(): void {
    this.stopAll(true);
    setTimeout(() => {
      this.changeColor();
      this.brightnessLevel = 100;
      this.saturationLevel = 100;
      this.updateBrightnessDots(100);
      this.updateSaturationDots(100);
    }, 200);
  }

  public changeColor(): void {
    this.stopAll(true);
    this.connectedDevice.writeColor(this.adjustedColor);
    this.presetService.updateActiveColor(this.adjustedColor.getHexCode());
  }

  public setColor(color: Color) {
    this.stopAll(true);
    this.color = color;
    this.adjustedColor = this.getAdjustedColor();

    if (this.color !== this.adjustedColor) {
      this.colorWheel.setColor(this.adjustedColor);
    }

    if (this.bottomColorCircle) {
      this.bottomColorCircle.style.backgroundColor = this.adjustedColor.getHexCode();
    }
  }

  public setBrightnessLevel(level: number): void {
    this.stopAll(true);
    this.brightnessLevel = level;
    this.updateSliderOfType(SliderType.left);

    if (this.saturationLevel === 100) {
      this.connectedDevice.setLedBrightness(level, this.adjustedColor);
    } else {
      this.connectedDevice.applyBrightnessAndSaturation(
        this.adjustedColor,
        this.brightnessLevel,
        this.saturationLevel
      );
    }
  }

  public setSaturationLevel(level: number): void {
    this.stopAll(true);
    this.saturationLevel = level;
    this.updateSliderOfType(SliderType.right);

    this.adjustedColor = this.getAdjustedColor();
    if (this.colorWheel) this.colorWheel.setColor(this.adjustedColor);
    if (this.bottomColorCircle) {
      this.bottomColorCircle.style.backgroundColor = this.adjustedColor.getHexCode();
    }

    if (this.brightnessLevel === 100) {
      this.connectedDevice.setSaturationLevel(level, this.adjustedColor);
    } else {
      this.connectedDevice.applyBrightnessAndSaturation(
        this.adjustedColor,
        this.brightnessLevel,
        this.saturationLevel
      );
    }
  }

  public getAdjustedColor(): Color {
    return this.color.desaturated(this.saturationLevel);
  }

  public updateSliderOfType(sliderType: SliderType): void {
    const sliderDotNumber =
      (sliderType == SliderType.left ? this.brightnessLevel : this.saturationLevel) / 10;
    const sliderTypeString = sliderType === SliderType.left ? 'left' : 'right';

    for (let i = 1; i <= 10; i++) {
      const dot = document.getElementById(`${sliderTypeString}-slider-dot-${i}`);
      if (!dot) continue;
      i === sliderDotNumber ? dot.classList.add('active') : dot.classList.remove('active');
    }
  }

  private updateBrightnessDots(level: number) {
    for (let i = 1; i <= 10; i++) {
      const dot = document.getElementById(`left-slider-dot-${i}`);
      if (!dot) continue;
      i === level / 10 ? dot.classList.add("active") : dot.classList.remove("active");
    }
  }

  private updateSaturationDots(level: number) {
    for (let i = 1; i <= 10; i++) {
      const dot = document.getElementById(`right-slider-dot-${i}`);
      if (!dot) continue;
      i === level / 10 ? dot.classList.add("active") : dot.classList.remove("active");
    }
  }

  public flash(): void {
    this.stopAll(true);
    if (this.connectedDevice && (this.connectedDevice as any).flash) {
      (this.connectedDevice as any).flash(this.brightnessLevel);
    }
  }

  public async disconnect() {
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
    this.navCtrl.navigateForward('/presets-page');
  }

  public goToDebugPage() {
    this.navCtrl.navigateForward('/debug-page');
  }

  /** HARD CANCEL: preset deactivation */
  public async deactivatePreset() {
    await this.stopAll(true);
    const restore = this.connectedDevice?.color;
    if (restore) {
      this.connectedDevice.writeColor(restore);
      this.currentValue.activeColor = restore.getHexCode();
      this.presetService.updateActiveColor(restore.getHexCode());
    } else {
      this.presetService.updateActiveColor(null);
      this.currentValue.activeColor = null;
    }
  }
}

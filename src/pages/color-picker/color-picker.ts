// color-picker.ts
import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Platform, NavController, AlertController } from '@ionic/angular';
import { Subscription } from 'rxjs';

import { ColorWheel } from '../../shared/components/color-wheel/color-wheel';
import { Color } from '../../shared/components/color-wheel/color';
import { Device } from '../../shared/models/device.model';
import { PresetsService, PresetEmitPayload } from '../../shared/services/presets.service';
import { DevicesService } from '../../shared/services/devices.service';
import { BackButtonService } from 'src/shared/services/back-button.service';
import { AlertFactory } from '../../shared/factories/alert.factory';

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

  public color: Color;
  public adjustedColor: Color;

  public brightnessLevel: number = 100;
  public saturationLevel: number = 100;

  public connectedDevice: Device;
  public bottomColorCircle: HTMLElement | null = null;

  public isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

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

  // animation controllers
  private rotationAbortController: AbortController | null = null;
  private cycleAbortController: AbortController | null = null;

  private presetSubscription?: Subscription;
  private backButtonSubscription?: Subscription;

  private lastBleWriteAt = 0;
  private bleWriteInterval = 50;

  // RAF / timeout IDs to ensure complete cleanup
  private rafId: number | null = null;
  private fallbackTimeoutId: any = null;

  // NEW: Track if we're actively animating
  private isAnimating = false;

  constructor(
    public devicesService: DevicesService,
    public platform: Platform,
    public navCtrl: NavController,
    public presetService: PresetsService,
    private backButtonService: BackButtonService,
    private alertFactory: AlertFactory,
    private alertController: AlertController
  ) {
    this.connectedDevice = this.devicesService.connectedDevice;
    this.color = this.connectedDevice?.color || new Color(255, 0, 0);
    this.adjustedColor = this.connectedDevice?.color || new Color(255, 0, 0);
  }

  // ------------------------------------------------------------
  // INIT / LIFECYCLE
  // ------------------------------------------------------------

  ngOnInit() {
    this.presetSubscription = this.presetService.presetSelected$.subscribe(async (payload: PresetEmitPayload) => {
      // Stop any existing rotation/animation first
      await this.stopAll();

      this.queueCanceled = false; // Reset Hard Cancel before new animation

      // If payload contains colors (rotation request), start rotating
      if (payload?.colors && payload.colors.length && payload.animation) {
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

        this.queueCanceled = false; // allow writes
        try {
          await this.connectedDevice.writeColor(payload.color);
        } catch (e) {
          console.warn('Static color write failed', e);
        }
      }
    });
  }

  ngAfterViewInit() {
    this.bottomColorCircle = document.getElementById('bottom-color-circle');
    if (this.bottomColorCircle) {
      this.bottomColorCircle.style.backgroundColor = this.adjustedColor.getHexCode();
    }
  }

  ngOnDestroy() {
    this.stopAll(true);

    if (this.presetSubscription) this.presetSubscription.unsubscribe();
    if (this.backButtonSubscription) this.backButtonSubscription.unsubscribe();
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
      try { this.rotationAbortController.abort(); } catch {}
      this.rotationAbortController = null;
    }

    if (this.cycleAbortController) {
      try { this.cycleAbortController.abort(); } catch {}
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

  ionViewWillEnter() {
    // 1. Define the custom logic (show alert, disconnect, navigate)
    const handler = () => this.showDisconnectAlert();

    // 2. Register the custom logic when the page is about to be visible
    this.backButtonService.registerHandler(handler);
  }

  ionViewWillLeave() {
    // 3. Unregister the custom logic when the page is about to disappear
    this.backButtonService.unregisterHandler();
  }

  private async showDisconnectAlert(): Promise<void> {
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
  }

  // ------------------------ Rotation orchestration ------------------------
  // ------------------------------------------------------------
  // ROTATION + ANIMATION
  // ------------------------------------------------------------

  private startRotation(colors: Color[], animation: string, speedMs: number) {
    // Each color animates for the FULL speed duration
    // Total cycle time = colors.length × speedMs
    // Example: 15 colors × 1000ms = 15 seconds for full cycle
    
    this.queueCanceled = false;
    this.isAnimating = true;

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
        
        this.currentValue.activeColor = base.getHexCode();
        this.presetService.updateActiveColor(base.getHexCode());

        if (this.cycleAbortController) {
          try { this.cycleAbortController.abort(); } catch {}
        }
        this.cycleAbortController = new AbortController();

        try {
          // Run selected animation (pulse/wave/strobe/mix) on LED
          // for this color for the full speed duration
          await this.runSingleCycle(
            animation as 'pulse' | 'wave' | 'strobe' | 'mix',
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

        idx++;
      }

      this.isAnimating = false;
      await this.stopAll(true);
    })();
  }

  private runSingleCycle(
    effect: 'pulse' | 'wave' | 'strobe' | 'mix',
    baseColor: Color,
    durationMs: number,
    abortSignal: AbortSignal
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const start = performance.now();

      const step = () => {
        if (abortSignal.aborted || !this.isAnimating) {
          this.clearTimers();
          reject(new DOMException('Aborted', 'AbortError'));
          return;
        }

        const now = performance.now();
        const elapsed = now - start;
        const t = Math.min(1, elapsed / durationMs);

        // Calculate color for current frame based on animation effect
        const frameColor = this.computeAnimationColor(effect, baseColor, t);

        // Update UI preview (bottom circle in color-picker.html)
        if (this.bottomColorCircle) {
          this.bottomColorCircle.style.backgroundColor = frameColor.getHexCode();
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

      this.rafId = requestAnimationFrame(step);
    });
  }

  // ------------------------------------------------------------
  // BLE WRITE QUEUE — HARD CANCEL SAFE
  // ------------------------------------------------------------

  private enqueueBleWrite(r: number, g: number, b: number): Promise<void> {
    if (!this.isiOS) {
      return this.connectedDevice.writeRGBColorWithoutResponse(r, g, b);
    }

    if (this.queueCanceled) return Promise.resolve();

    this.writeQueue = this.writeQueue.then(() => {
      if (this.queueCanceled) return Promise.resolve();

      return this.connectedDevice
        .writeRGBColor(r, g, b)
        .then(() => new Promise(res => setTimeout(res, 25)));
    });

    return this.writeQueue;
  }

  // ------------------------------------------------------------
  // ANIMATION MATH
  // ------------------------------------------------------------

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
    const seg = Math.floor(t * 3);
    const local = t * 3 - seg;
    switch (seg) {
      case 0: return this.pulseColor(base, local);
      case 1: return this.waveColor(base, local);
      default: return this.strobeColor(base, local);
    }
  }

  // ------------------------------------------------------------
  // BRIGHTNESS / SATURATION / COLOR PICKER ACTIONS
  // ------------------------------------------------------------
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
  
  public changeDeviceColor() {
    this.stopAll(true);
    this.queueCanceled = false;

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
    this.queueCanceled = false;

    this.connectedDevice.writeColor(this.adjustedColor);
    this.presetService.updateActiveColor(this.adjustedColor.getHexCode());
  }

  public setColor(color: Color) {
    this.stopAll(true);
    this.queueCanceled = false;

    this.color = color;
    this.adjustedColor = this.getAdjustedColor();
    this.colorWheel.setColor(this.adjustedColor);

    if (this.bottomColorCircle) {
      this.bottomColorCircle.style.backgroundColor = this.adjustedColor.getHexCode();
    }
  }

  public setBrightnessLevel(level: number) {
    this.stopAll(true);
    this.queueCanceled = false;

    this.brightnessLevel = level;
    this.updateSliderOfType(SliderType.left);

    if (this.saturationLevel === 100) {
      this.connectedDevice.setLedBrightness(level, this.adjustedColor);
    } else {
      this.connectedDevice.applyBrightnessAndSaturation(
        this.adjustedColor, this.brightnessLevel, this.saturationLevel
      );
    }
  }

  public setSaturationLevel(level: number) {
    this.stopAll(true);
    this.queueCanceled = false;

    this.saturationLevel = level;
    this.updateSliderOfType(SliderType.right);

    this.adjustedColor = this.getAdjustedColor();
    this.colorWheel.setColor(this.adjustedColor);

    if (this.bottomColorCircle) {
      this.bottomColorCircle.style.backgroundColor = this.adjustedColor.getHexCode();
    }

    if (this.brightnessLevel === 100) {
      this.connectedDevice.setSaturationLevel(level, this.adjustedColor);
    } else {
      this.connectedDevice.applyBrightnessAndSaturation(
        this.adjustedColor, this.brightnessLevel, this.saturationLevel
      );
    }
  }

  private getAdjustedColor(): Color {
    return this.color.desaturated(this.saturationLevel);
  }

  private updateSliderOfType(type: SliderType) {
    const val = type === SliderType.left ? this.brightnessLevel : this.saturationLevel;
    const idx = val / 10;
    const prefix = type === SliderType.left ? 'left' : 'right';

    for (let i = 1; i <= 10; i++) {
      const dot = document.getElementById(`${prefix}-slider-dot-${i}`);
      if (!dot) continue;

      if (i === idx) dot.classList.add('active');
      else dot.classList.remove('active');
    }
  }

  private updateBrightnessDots(level: number) {
    for (let i = 1; i <= 10; i++) {
      const dot = document.getElementById(`left-slider-dot-${i}`);
      if (!dot) continue;
      dot.classList.toggle("active", i === level / 10);
    }
  }

  private updateSaturationDots(level: number) {
    for (let i = 1; i <= 10; i++) {
      const dot = document.getElementById(`right-slider-dot-${i}`);
      if (!dot) continue;
      dot.classList.toggle("active", i === level / 10);
    }
  }

  // ------------------------------------------------------------
  // OTHER ACTIONS
  // ------------------------------------------------------------

  public flash() {
    this.stopAll(true);
    this.queueCanceled = false;

    if (this.connectedDevice && (this.connectedDevice as any).flash) {
      (this.connectedDevice as any).flash(this.brightnessLevel);
    }
  }

  public async disconnect() {
    this.stopAll(true);
    this.queueCanceled = false;

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

  // ------------------------------------------------------------
  // BACK BUTTON HANDLER (ANDROID)
  // ------------------------------------------------------------

  private setupBackButtonHandler() {
    if (this.backButtonSubscription) this.backButtonSubscription.unsubscribe();

    this.backButtonSubscription = this.platform.backButton.subscribeWithPriority(99, async () => {
      const alert = await this.alertController.create({
        header: 'Disconnect Device',
        cssClass: 'custom-color-alert',
        message: 'Are you sure you want to go back? It will disconnect the device.',
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
    });
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

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

  public color: Color;
  public adjustedColor: Color;

  public brightnessLevel: number = 100;
  public saturationLevel: number = 100;

  public connectedDevice: Device;
  public bottomColorCircle: HTMLElement | null = null;

  public isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  // UI state
  public currentValue: any = {
    presetStatus: false,
    animation: null,
    activeColor: null,
    speed: 1000,
    brightness: 100
  };

  private presetSubscription?: Subscription;

  // modules
  private bleWriter!: BleWriter;
  private animationEngine!: AnimationEngine;

  private backButtonSubscription?: Subscription;
  private brightnessSubscription?: Subscription;

  constructor(
    public devicesService: DevicesService,
    public platform: Platform,
    public navCtrl: NavController,
    public presetService: PresetsService,
    private alertController: AlertController
  ) {
    this.connectedDevice = this.devicesService.connectedDevice;
    this.color = this.connectedDevice?.color || new Color(255, 0, 0);
    this.adjustedColor = this.connectedDevice?.color || new Color(255, 0, 0)    
  }

  ngOnInit() {
    // instantiate modules
    this.bleWriter = new BleWriter(this.connectedDevice, this.isiOS);
    this.animationEngine = new AnimationEngine(this.bleWriter);

    this.brightnessSubscription = this.presetService.brightnessSelected$.subscribe(
      async (value: number | null) => {
        this.currentValue.brightness = value
      }
    );

    this.presetSubscription = this.presetService.presetSelected$.subscribe(async (payload: PresetEmitPayload) => {
      // Stop any existing rotation/animation first
      await this.stopAll(true);

      // Reset queue/hard-cancel handled in stopAll
      // If payload contains colors (rotation request), start rotating
      if (payload?.colors && payload.colors.length && payload.animation) {
        this.currentValue.presetStatus = true;
        this.currentValue.animation = payload.animation;
        this.currentValue.speed = Math.max(50, Math.round(payload.speed || 1000));

        // Decide whether single-strip or multi-arm
        const anim = (payload.animation || '').toLowerCase();
        if (['patagonian', 'kalahari', 'chalbi', 'thar'].includes(anim)) {
          // multi-arm preset
          this.bleWriter.setBleWriteInterval(this.currentValue.speed);
          this.animationEngine.startMultiArm(anim, payload.colors[0], this.currentValue.speed, 
            this.currentValue.brightness, (arms) => {
            // update UI preview with arms[0]
            if (this.bottomColorCircle && arms && arms.length) {
              this.bottomColorCircle.style.backgroundColor = arms[0].getHexCode();
            }
            this.currentValue.activeColor = arms[0].getHexCode();
            this.presetService.updateActiveColor(this.currentValue.activeColor);
          });
        } else {
          // single-strip existing effects (pulse/wave/strobe/mix)
          const base = payload.colors[0];
          this.bleWriter.setBleWriteInterval(this.currentValue.speed);
          this.animationEngine.startSingleStrip(payload.animation as any, base, this.currentValue.speed, (frameColor) => {
            if (this.bottomColorCircle) this.bottomColorCircle.style.backgroundColor = frameColor.getHexCode();
            this.currentValue.activeColor = frameColor.getHexCode();
            this.presetService.updateActiveColor(this.currentValue.activeColor);
          });
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

    this.presetService.clearColorPickerBackEffect$.subscribe(async (payload: boolean) => {
      if (this.backButtonSubscription) this.backButtonSubscription.unsubscribe();
    }); 
  }

  ngAfterViewInit() {
    this.bottomColorCircle = document.getElementById('bottom-color-circle');
    if (this.bottomColorCircle) {
      this.bottomColorCircle.style.backgroundColor = this.adjustedColor.getHexCode();
    }
  }

  ionViewWillEnter() {
    if (this.backButtonSubscription) this.backButtonSubscription.unsubscribe();
    this.setupHardwareBackButton();
  }


  /* // ✅ METHOD 5: ionViewWillLeave() - Before leaving page
  ionViewWillLeave() {
      if (this.backButtonSubscription) this.backButtonSubscription.unsubscribe();
  } */


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
          // Let default back behavior execute
        } catch (error) {
          console.error('Error:', error);
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
    this.stopAll(true);
    if (this.brightnessSubscription) this.brightnessSubscription.unsubscribe();
    if (this.backButtonSubscription) this.backButtonSubscription.unsubscribe();
    if (this.presetSubscription) this.presetSubscription.unsubscribe();
  }

  // STOP / HARD CANCEL behavior preserved + delegated to modules
  private async stopAll(hard: boolean = false) {
    // stop animation engine (which will call bleWriter.stopAllWrites when hard)
    try {
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

    // small tick
    await new Promise(res => setTimeout(res, 10));
  }

  public changeDeviceColor() {
    this.stopAll(true);
    // keep boolean flag to allow next writes
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
    this.connectedDevice.writeColor(this.adjustedColor);
    this.presetService.updateActiveColor(this.adjustedColor.getHexCode());
  }

  public setColor(color: Color) {
    this.stopAll(true);
    this.color = color;
    this.adjustedColor = this.getAdjustedColor();
    this.colorWheel.setColor(this.adjustedColor);
    if (this.bottomColorCircle) this.bottomColorCircle.style.backgroundColor = this.adjustedColor.getHexCode();
  }

  public setBrightnessLevel(level: number) {
    this.stopAll(true);
    this.brightnessLevel = level;
    this.updateSliderOfType(SliderType.left);

    if (this.saturationLevel === 100) {
      this.connectedDevice.setLedBrightness(level, this.adjustedColor);
    } else {
      this.connectedDevice.applyBrightnessAndSaturation(this.adjustedColor, this.brightnessLevel, this.saturationLevel);
    }
  }

  public setSaturationLevel(level: number) {
    this.stopAll(true);
    this.saturationLevel = level;
    this.updateSliderOfType(SliderType.right);
    this.adjustedColor = this.getAdjustedColor();
    this.colorWheel.setColor(this.adjustedColor);
    if (this.bottomColorCircle) this.bottomColorCircle.style.backgroundColor = this.adjustedColor.getHexCode();

    if (this.brightnessLevel === 100) {
      this.connectedDevice.setSaturationLevel(level, this.adjustedColor);
    } else {
      this.connectedDevice.applyBrightnessAndSaturation(this.adjustedColor, this.brightnessLevel, this.saturationLevel);
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

  public flash() {
    this.stopAll(true);
    if (this.connectedDevice && (this.connectedDevice as any).flash) {
      (this.connectedDevice as any).flash(this.brightnessLevel);
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
      this.connectedDevice.writeColor(restore);
      this.currentValue.activeColor = restore.getHexCode();
      this.presetService.updateActiveColor(restore.getHexCode());
    } else {
      this.presetService.updateActiveColor(null);
      this.currentValue.activeColor = null;
    }
  }
}

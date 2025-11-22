// shared/core/ble/ble-writer.ts
// Responsible for all BLE write activity. iOS-safe queue and hard-cancel support.
// Keeps detailed logs for debugging. Minimal external surface: writeRGB, writeArms, stopAllWrites, setBleWriteInterval.

import { Device } from '../../../shared/models/device.model';
import { Color } from '../../../shared/components/color-wheel/color';

export class BleWriter {
  private device: Device;
  private isiOS: boolean;
  private writeQueue: Promise<void> = Promise.resolve();
  private queueCanceled = false;
  private lastBleWriteAt = 0;
  private bleWriteInterval = 50;

  // ===============================================================
  // ADAPTIVE iOS BLE RATE TUNING
  // ===============================================================
  private avgAckTime = 200;  // start with a safe baseline
  private adaptiveMin = 120; // lowest allowed interval
  private adaptiveMax = 350; // highest allowed interval

  constructor(device: Device, isiOS: boolean) {
    this.device = device;
    this.isiOS = isiOS;
  }

  private tuneIOSWriteRate(lastAckDurationMs: number) {
    // exponential smoothing for ACK time
    this.avgAckTime = (0.7 * this.avgAckTime) + (0.3 * lastAckDurationMs);

    let newInterval = this.adaptiveMax;

    if (this.avgAckTime < 60) newInterval = 120;
    else if (this.avgAckTime < 120) newInterval = 180;
    else if (this.avgAckTime < 200) newInterval = 250;
    else if (this.avgAckTime < 300) newInterval = 300;
    else newInterval = 350;

    this.bleWriteInterval = Math.min(this.adaptiveMax, Math.max(this.adaptiveMin, newInterval));

    console.log(`[BLE WRITER][iOS Adaptive] ACK=${lastAckDurationMs.toFixed(1)}ms avg=${this.avgAckTime.toFixed(1)}ms → interval=${this.bleWriteInterval}ms`);
  }

  public setBleWriteInterval(ms: number) {
    if (this.isiOS) {
      this.bleWriteInterval = 350;
    } else {
      this.bleWriteInterval = Math.max(1, Math.round(
        ms <= 300 ? 30 : (ms <= 600 ? 40 : 50)
      ));
    }
    console.log('[BLE WRITER] setBleWriteInterval ->', this.bleWriteInterval);
  }

  public stopAllWrites(hard: boolean = false) {
    if (hard && this.isiOS) {
      this.queueCanceled = true;
      this.writeQueue = Promise.resolve();
      console.log('[BLE WRITER] HARD STOP - writeQueue reset at', performance.now().toFixed(2));
    } else if (hard) {
      this.queueCanceled = true;
      this.writeQueue = Promise.resolve();
      console.log('[BLE WRITER] HARD STOP (non-iOS) at', performance.now().toFixed(2));
    } else {
      this.queueCanceled = false;
    }
  }

  // Public: write a global single RGB (3 bytes)
  public writeRGB(r: number, g: number, b: number): Promise<void> {
    if (!this.isiOS) {
      this.lastBleWriteAt = performance.now();
      return this.device.writeRGBColorWithoutResponse(r, g, b);
    }

    if (this.queueCanceled) return Promise.resolve();

    console.log('[BLE WRITER] enqueue RGB at', performance.now().toFixed(2), 'rgb=', r, g, b);
    this.writeQueue = this.writeQueue.then<void>(() => {
      if (this.queueCanceled) return Promise.resolve();

      const callAt = performance.now();
      console.log('[BLE WRITER][iOS] starting RGB write at', callAt.toFixed(2), 'rgb=', r, g, b);
      const startWrite = performance.now();
      return this.device.writeRGBColor(r, g, b).then(() => {
        const ackAt = performance.now();
        const dur = (ackAt - startWrite).toFixed(1);
        console.log('[BLE WRITER][iOS] RGB ACK at', ackAt.toFixed(2), `dur=${dur}ms`);
        const duration = ackAt - startWrite;
        // ADAPTIVE RATE UPDATE
        this.tuneIOSWriteRate(duration);
        this.lastBleWriteAt = ackAt;
        return new Promise<void>(res => setTimeout(res, 25));
      }).catch(err => {
        console.warn('[BLE WRITER][iOS] RGB write failed', err);
        throw err;
      });
    });

    return this.writeQueue;
  }

  // Public: write all 4 arms (expects Color[]). On non-iOS this is fire-and-forget.
  public writeArms(arms: Color[]): Promise<void> {
    if (!this.isiOS) {
      this.lastBleWriteAt = performance.now();
      return this.device.writeAllArmsColorWithoutResponse(arms);
    }

    if (this.queueCanceled) return Promise.resolve();

    console.log('[BLE WRITER] enqueue ARMS at', performance.now().toFixed(2), 'arms=', arms.map(a => a.getHexCode()));
    this.writeQueue = this.writeQueue.then<void>(() => {
      if (this.queueCanceled) return Promise.resolve();

      const callAt = performance.now();
      console.log('[BLE WRITER][iOS] starting ARMS write at', callAt.toFixed(2), 'arms=', arms.map(a => a.getHexCode()).join(', '));
      const startWrite = performance.now();
      return this.device.writeAllArmsColor(arms).then(() => {
        const ackAt = performance.now();
        const duration = ackAt - startWrite;
        // ADAPTIVE RATE UPDATE
        this.tuneIOSWriteRate(duration);
        const dur = (ackAt - startWrite).toFixed(1);
        console.log('[BLE WRITER][iOS] ARMS ACK at', ackAt.toFixed(2), `dur=${dur}ms`);
        this.lastBleWriteAt = ackAt;
        return new Promise<void>(res => setTimeout(res, 25));
      }).catch(err => {
        console.warn('[BLE WRITER][iOS] ARMS write failed', err);
        throw err;
      });
    });

    return this.writeQueue;
  }

  // Helper: guard whether enough time has passed to attempt a write
  public canAttemptWrite(): boolean {
    const now = performance.now();
    if (now - this.lastBleWriteAt >= this.bleWriteInterval) {
      this.lastBleWriteAt = now;
      return true;
    }
    return false;
  }
}

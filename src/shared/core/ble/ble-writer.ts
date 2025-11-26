// shared/core/ble/ble-writer.ts
// Responsible for all BLE write activity. iOS-safe queue and hard-cancel support.
// Keeps detailed logs for debugging. Minimal external surface: writeRGB, writeArms, stopAllWrites, setBleWriteInterval.

import { Device } from '../../../shared/models/device.model';
import { Color } from '../../../shared/components/color-wheel/color';

export class BleWriter {
  private device: Device;
  private isiOS: boolean;

  // Promise chain for serializing iOS writes
  private writeQueue: Promise<void> = Promise.resolve();

  // cancellation / queue control
  private queueCanceled = false;

  // last write timing + pacing
  private lastBleWriteAt = 0;
  private bleWriteInterval = 50;

  // ADAPTIVE iOS RATE TUNING
  private avgAckTime = 200;  // start with a safe baseline
  private adaptiveMin = 120; // lowest allowed interval
  private adaptiveMax = 350; // highest allowed interval

  // ---------- Cancel signal (new) ----------
  // A promise that resolves when cancel is requested; resolved immediately on hard stop.
  // We replace/reset this when needed.
  private cancelSignal: Promise<void> = Promise.resolve();
  private cancelResolver: (() => void) | null = null;

  constructor(device: Device, isiOS: boolean) {
    this.device = device;
    this.isiOS = isiOS;
    this.resetCancelSignal();
  }

  // Create a fresh unresolved cancelSignal (used for normal operation)
  private resetCancelSignal() {
    this.cancelSignal = new Promise<void>(res => {
      this.cancelResolver = res;
    });
  }

  // Resolve current cancelSignal immediately (used for hard stop); also clear resolver
  private resolveCancelSignal() {
    if (this.cancelResolver) {
      try { this.cancelResolver(); } catch (_) {}
      this.cancelResolver = null;
    }
    // replace with already-resolved promise so future races won't wait
    this.cancelSignal = Promise.resolve();
  }

  // ===============================================================
  // ADAPTIVE iOS BLE RATE TUNING
  // ===============================================================
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
      // keep safe iOS default — animation engine sets/writeQueue throttling controls real rate
      this.bleWriteInterval = 350;
    } else {
      this.bleWriteInterval = Math.max(1, Math.round(
        ms <= 300 ? 30 : (ms <= 600 ? 40 : 50)
      ));
    }
    console.log('[BLE WRITER] setBleWriteInterval ->', this.bleWriteInterval);
  }

  /**
   * Hard stop: cancel queue + short-circuit any awaiting writes.
   * Soft stop (hard=false): clears cancel flag and resets cancel signal so writes can proceed.
   */
  public stopAllWrites(hard: boolean = false) {
    if (hard) {
      // Mark canceled — prevents further writes and makes canAttemptWrite return false
      this.queueCanceled = true;

      // Resolve the cancelSignal so any in-flight Promise.race unblocks immediately
      this.resolveCancelSignal();

      // Reset the writeQueue chain so future .then won't get chained to old in-flight promises
      this.writeQueue = Promise.resolve();

      // Ensure cancelSignal is resolved so no future race hangs
      this.cancelSignal = Promise.resolve();
      this.cancelResolver = null;

      console.log('[BLE WRITER] HARD STOP - writeQueue reset at', performance.now().toFixed(2));
      return;
    }

    // Soft stop: allow writes again
    this.queueCanceled = false;
    this.resetCancelSignal();
  }

  // Public: write a global single RGB (3 bytes)
  public writeRGB(r: number, g: number, b: number): Promise<void> {
    if (!this.isiOS) {
      this.lastBleWriteAt = performance.now();
      return this.device.writeRGBColorWithoutResponse(r, g, b);
    }

    if (this.queueCanceled) return Promise.resolve();

    console.log('[BLE WRITER] enqueue RGB at', performance.now().toFixed(2), 'rgb=', r, g, b);

    // Chain serial writes to enforce iOS ordering
    this.writeQueue = this.writeQueue.then<void>(() => {
      if (this.queueCanceled) return Promise.resolve();

      const callAt = performance.now();
      console.log('[BLE WRITER][iOS] starting RGB write at', callAt.toFixed(2), 'rgb=', r, g, b);
      const startWrite = performance.now();

      const writePromise = this.device.writeRGBColor(r, g, b);

      // Race the hardware write against cancelSignal so a hard stop will short-circuit
      return Promise.race([
        writePromise.then(() => ({ ok: true })),
        this.cancelSignal.then(() => ({ ok: false }))
      ]).then((result: any) => {
        // If canceled while waiting, or queueCanceled became true, short-circuit
        if (!result || result.ok === false || this.queueCanceled) {
          console.log('[BLE WRITER][iOS] RGB short-circuited due to cancel at', performance.now().toFixed(2));
          return Promise.resolve();
        }

        // Normal ACK path
        const ackAt = performance.now();
        const duration = ackAt - startWrite;
        this.tuneIOSWriteRate(duration);
        this.lastBleWriteAt = ackAt;

        // small pacing delay only when not canceled
        if (this.queueCanceled) return Promise.resolve();
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

      const writePromise = this.device.writeAllArmsColor(arms);

      // Race the hardware write against cancelSignal so a hard stop will short-circuit waiting
      return Promise.race([
        writePromise.then(() => ({ ok: true })),
        this.cancelSignal.then(() => ({ ok: false }))
      ]).then((result: any) => {
        if (!result || result.ok === false || this.queueCanceled) {
          console.log('[BLE WRITER][iOS] ARMS short-circuited due to cancel at', performance.now().toFixed(2));
          return Promise.resolve();
        }

        const ackAt = performance.now();
        const duration = ackAt - startWrite;
        this.tuneIOSWriteRate(duration);
        this.lastBleWriteAt = ackAt;

        if (this.queueCanceled) return Promise.resolve();;
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
    if (this.queueCanceled) return false;
    const now = performance.now();
    if (now - this.lastBleWriteAt >= this.bleWriteInterval) {
      this.lastBleWriteAt = now;
      return true;
    }
    return false;
  }

  // Existing external API to set queue canceled flag (keeps backward compatibility)
  public updateQueueStatus(value:boolean): void {
    this.queueCanceled = !!value;
    if (this.queueCanceled) {
      // Resolve cancel so any in-flight waits return fast
      this.resolveCancelSignal();
    } else {
      // create a fresh unresolved cancel signal
      this.resetCancelSignal();
    }
  }
}

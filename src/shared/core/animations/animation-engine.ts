// shared/core/animations/animation-engine.ts
// Coordinates RAF loop and decides whether to call single-strip or multi-arm flows.
// Uses BleWriter for actual writes and Presets logic for frame generation.
// Keeps detailed logs. Exposes start/stop controls.

import { Color } from '../../../shared/components/color-wheel/color';
import { BleWriter } from '../ble/ble-writer';
import { computeMultiArmPresetFrame } from '../presets/presets-logic';

export type SingleEffect = 'pulse' | 'wave' | 'strobe' | 'mix';

export class AnimationEngine {
  private bleWriter: BleWriter;
  private rafId: number | null = null;
  private fallbackTimeoutId: any = null;
  private isAnimating = false;
  private lastBleWriteAt = 0;
  private currentBrightness: number = 0;

  constructor(bleWriter: BleWriter) {
    this.bleWriter = bleWriter;
  }

  // ===================================================================
  //  SINGLE STRIP ANIMATION (pulse, wave, strobe, mix)
  // ===================================================================
  public startSingleStrip(
    effect: SingleEffect,
    baseColor: Color,
    durationMs: number,
    onFrame?: (color: Color) => void
  ): void {
    if (this.isAnimating) this.stop(true);
    this.isAnimating = true;
    console.log('[ANIM] startSingleStrip effect=', effect, 'duration=', durationMs);
    if((this.bleWriter as any).isiOS) {
      this.bleWriter.stopAllWrites(true);
      this.bleWriter.updateQueueStatus(false);  
    }
    
    // set the dynamic duration (can be updated later)
    this.currentDurationMs = durationMs;

    let start = performance.now();
    const step = async () => {
      // Always check cancel FIRST
      if (!this.isAnimating) {
        this.cleanup();
        return;
      }

      const now = performance.now();
      let elapsed = now - start;
      const t = Math.min(1, elapsed / this.currentDurationMs);

      const frameColor = this.computeAnimationColor(effect, baseColor, t);

      // optional callback for UI
      try { if (onFrame) onFrame(frameColor); } catch (e) { console.warn('[ANIM] onFrame error', e); }

      // Throttle writes via bleWriter.canAttemptWrite + bleWriter.writeRGB
      if (this.bleWriter.canAttemptWrite()) {
        try {
          if ((this.bleWriter as any).isiOS) {
            await this.bleWriter.writeRGB(frameColor.r, frameColor.g, frameColor.b);
          } else {
            // faster on Android - fire and forget
            this.bleWriter.writeRGB(frameColor.r, frameColor.g, frameColor.b);
          }
        } catch (err) {
          console.warn('[ANIM] single-strip write error', err);
        }
      }

      // CYCLIC restart logic — SAFE VERSION
      if (elapsed >= this.currentDurationMs) {
        start = performance.now();
        elapsed = 0;
      }

      // schedule next only if still running
      if (this.isAnimating) {
        this.rafId = requestAnimationFrame(step);
      }
    };

    this.rafId = requestAnimationFrame(step);
  }

  // ===================================================================
  //  MULTI-ARM ANIMATION (patagonian / chalbi / thar / kalahari)
  // ===================================================================
  public startMultiArm(
    preset: string,
    baseColor: Color,
    durationMs: number,
    brightness: number,
    onFrame?: (arms: Color[]) => void
  ) {
    if (this.isAnimating) this.stop(true);
    this.isAnimating = true;
    this.currentBrightness = brightness;
    console.log('[ANIM] startMultiArm preset=', preset, 'duration=', durationMs, 'brightness=', brightness);
    this.bleWriter.updateQueueStatus(false);  //  Reset the queue status so that animation engine can write in case of iOS
    let start = performance.now();
    let elapsed = 0;

    const step = async () => {
      // Always check cancel FIRST
      if (!this.isAnimating) {
        this.cleanup();
        return;
      }

      const now = performance.now();
      elapsed = now - start;
      const t = Math.min(1, elapsed / durationMs);

      // Build per-arm colors using pure preset logic
      const arms = computeMultiArmPresetFrame(preset, baseColor, this.currentBrightness, t, elapsed, durationMs);

      // optional UI callback
      try { if (onFrame) onFrame(arms); } catch (e) { console.warn('[ANIM] onFrame error', e); }

      // Throttle writes via bleWriter.canAttemptWrite + bleWriter.writeArms
      if (this.bleWriter.canAttemptWrite()) {
        try {
          if ((this.bleWriter as any).isiOS) {
            await this.bleWriter.writeArms(arms);
          } else {
            this.bleWriter.writeArms(arms);
          }
        } catch (err) {
          console.warn('[ANIM] multi-arm write error', err);
        }
      }
      // IMPORTANT:
      // Check isAnimating again before cycling
      if (!this.isAnimating) {
        this.cleanup();
        return;
      }

      // CYCLIC restart logic — SAFE VERSION
      if (elapsed >= durationMs) {
        // restart cycle
        start = performance.now();
        elapsed = 0;
      }

      // FINAL CHECK before re-scheduling RAF
      if (!this.isAnimating) {
        this.cleanup();
        return;
      } else {
        this.rafId = requestAnimationFrame(step);
      }

    };

    this.rafId = requestAnimationFrame(step);
  }

  // ===================================================================
  //  STOP (Cancel / Hard cancel)
  // ===================================================================
  public stop(hard: boolean = false) {
    if (!this.isAnimating) return;
    console.log('[ANIM] stop requested, hard=', hard);
    this.isAnimating = false;

    // Stop BLE queue first
    try {
      this.bleWriter.stopAllWrites(hard);
    } catch (err) {
      console.warn('[ANIM] bleWriter stop error', err);
    }

    this.cleanup();
  }

  public isRunning() {
    return this.isAnimating;
  }

  // ===================================================================
  //  CLEANUP
  // ===================================================================
  private cleanup() {
    if (this.rafId != null) cancelAnimationFrame(this.rafId);
    this.rafId = null;

    if (this.fallbackTimeoutId != null) clearTimeout(this.fallbackTimeoutId);
    this.fallbackTimeoutId = null;

    console.log('[ANIM] cleanup completed at', performance.now().toFixed(2));
  }

  // ===================================================================
  // Animation math (unchanged)
  // ===================================================================
  public computeAnimationColor(effect: SingleEffect, base: Color, t: number): Color {
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
    return t <= 0.2 ? new Color(0, 0, 0) : base;
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

  public updateBrightness(value: number): void {
    this.currentBrightness = value;
    console.log('[ANIM] updated brightness. set at - ', value);
  }

  // add at top of class
  private currentDurationMs: number = 1000; // default
  private rotationIndex?: number; // not used for singleStrip, kept if needed
  // add method to update runtime speed
  public updateSpeed(newDurationMs: number) {
    // clamp to sane values
    if (!newDurationMs || newDurationMs <= 0) return;
    this.currentDurationMs = newDurationMs;
    // optionally adjust BLE writer settings here
    try { if ((this.bleWriter as any).setBleWriteInterval) (this.bleWriter as any).setBleWriteInterval(newDurationMs); } catch (_) { }
    console.log('[ANIM] updateSpeed called, newDurationMs=', newDurationMs);
  }
}

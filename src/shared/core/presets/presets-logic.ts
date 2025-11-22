// shared/core/presets/presets-logic.ts
// Pure preset logic. Given preset name, base color, and normalized time (0..1) + elapsedMs, returns Color[] for arms.
// No BLE, no UI side-effects here.

import { Color } from '../../../shared/components/color-wheel/color';

/**
 * computeMultiArmPresetFrame
 * @param preset name (patagonian|kalahari|chalbi|thar)
 * @param baseColor base Color (used by some presets)
 * @param t normalized time 0..1 for the full cycle
 * @param elapsedMs elapsed milliseconds inside the cycle
 * @param durationMs full duration in ms
 * @returns Color[4]
 */
export function computeMultiArmPresetFrame(
  preset: string,
  baseColor: Color,
  brightness: number,
  t: number,
  elapsedMs: number,
  durationMs: number
): Color[] {
  const armsCount = 4;
  // helper to default-fill
  const fillBase = (c: Color) => [c, c, c, c];

  // helper to update the brightness
  const scale = brightness / 100
  const scaleBrightness = (v: number) => scale * v;

  // Small helpers for reuse
  const clampColor = (c: Color) => new Color(Math.max(0, Math.min(255, Math.round(c.r))), Math.max(0, Math.min(255, Math.round(c.g))), Math.max(0, Math.min(255, Math.round(c.b))));

  switch ((preset || '').toLowerCase()) {
    case 'kalahari': {
      // fast color-shift using sin waves across channels
      const speedFactor = 6;
      const r = Math.round((Math.sin(2 * Math.PI * (t * speedFactor) + 0) * 0.5 + 0.5) * 255);
      const g = Math.round((Math.sin(2 * Math.PI * (t * speedFactor) + 2) * 0.5 + 0.5) * 255);
      const b = Math.round((Math.sin(2 * Math.PI * (t * speedFactor) + 4) * 0.5 + 0.5) * 255);
      const c = clampColor(new Color(scaleBrightness(r), scaleBrightness(g), scaleBrightness(b)));
      return [c, c, c, c];
    }

    case 'patagonian': {
      // Four-phase within cycle
      const phase = Math.floor(t * 4);
      const purple = new Color(scaleBrightness(128), 0, scaleBrightness(128));
      const red = new Color(scaleBrightness(255), 0, 0);
      const darkBlue = new Color(0, 0, scaleBrightness(80));
      const aqua = new Color(0, scaleBrightness(180), scaleBrightness(180));
      const green = new Color(0, scaleBrightness(255), 0);
      const blackLightPurple = new Color(scaleBrightness(70), scaleBrightness(20), scaleBrightness(90));

      let bg = purple, chase = red;
      if (phase === 0) { bg = purple; chase = red; }
      else if (phase === 1) { bg = red; chase = blackLightPurple; }
      else if (phase === 2) { bg = darkBlue; chase = red; }
      else { bg = aqua; chase = green; }

      // REVIEW: stepMs tuning - adjust externally if you want chase faster/slower
      const stepsPerPhase = 16;  // <— old was 12
      const stepMs = durationMs / stepsPerPhase;
      const chaseIndex = Math.floor(elapsedMs / stepMs) % armsCount;
      const arr = [bg, bg, bg, bg];
      arr[chaseIndex] = chase;
      return arr.map(clampColor);
    }

    case 'chalbi': {
      const phase = Math.floor(t * 2);
      const blue = new Color(0, scaleBrightness(50), scaleBrightness(255));
      const yellow = new Color(scaleBrightness(255), scaleBrightness(220), 0);
      const bg = phase === 0 ? blue : yellow;
      const chase = phase === 0 ? yellow : blue;
      const stepsPerPhase = 16;
      const stepMs = durationMs / stepsPerPhase;
      const chaseIndex = Math.floor(elapsedMs / stepMs) % armsCount;
      const arr = [bg, bg, bg, bg];
      arr[chaseIndex] = chase;
      return arr.map(clampColor);
    }

    case 'thar': {
      const combos: Color[][] = [
        [new Color(0, 0, scaleBrightness(255)), new Color(scaleBrightness(255), 0, 0)],   // Blue & Red
        [new Color(0, scaleBrightness(255), 0), new Color(scaleBrightness(128), 0, scaleBrightness(128))], // Green & Purple
        [new Color(scaleBrightness(255), 0, 0), new Color(scaleBrightness(255), scaleBrightness(200), 0)], // Red & Yellow
      ];
      const comboIndex = Math.floor(t * combos.length) % combos.length;
      const combo = combos[comboIndex];
      const baseArr: Color[] = [combo[0], combo[1], combo[0], combo[1]];
      const stepsPerPhase = 16;
      const stepMs = durationMs / stepsPerPhase;
      const chaseIndex = Math.floor(elapsedMs / stepMs) % armsCount;
      const rotated = baseArr.map((_, i) => baseArr[(i - chaseIndex + armsCount) % armsCount]);
      return rotated.map(clampColor);
    }

    default:
      return fillBase(baseColor).map(clampColor);
  }
}

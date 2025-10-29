// helpers.ts

/**
 * Standard event names for touch (mobile) and mouse (desktop)
 */
export const EVENT = {
  START: 'touchstart',
  MOVE: 'touchmove',
  STOP: 'touchend',
  MOUSEDOWN: 'mousedown',
  MOUSEMOVE: 'mousemove',
  MOUSEUP: 'mouseup',
  MOUSELEAVE: 'mouseleave'
};

/**
 * Calculates the device pixel ratio for high-resolution displays.
 */
export const getPixelRatio = (context: CanvasRenderingContext2D): number => {
  const dpr = window.devicePixelRatio || 1;

  const bsr =
    (context as any).webkitBackingStorePixelRatio ||
    (context as any).mozBackingStorePixelRatio ||
    (context as any).msBackingStorePixelRatio ||
    (context as any).oBackingStorePixelRatio ||
    (context as any).backingStorePixelRatio ||
    1;

  return dpr / bsr;
};

/**
 * Converts a number (0-255) to a two-character hexadecimal string.
 */
export const toHex = (num: number): string => {
  num = parseInt(num.toString(), 10);

  if (isNaN(num)) {
    return '00';
  }

  num = Math.max(0, Math.min(num, 255));
  const hex = num.toString(16).toUpperCase();

  return hex.length === 1 ? '0' + hex : hex;
};

// --- PLACEHOLDER CLASSES (Assuming your original files contained these) ---

// Placeholder for Point class:
export class Point {
    constructor(public x: number, public y: number) {}

    distanceTo(other: Point): number {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    // Placeholder for isInStroke (requires context but simplified here)
    isInStroke(context: CanvasRenderingContext2D, center: Point, radius: number, tolerance: number = 20): boolean {
        const distance = this.distanceTo(center);
        // Check if point is within the ring area defined by radius +/- tolerance
        return distance > radius - tolerance && distance < radius + tolerance;
    }

    // Placeholder for getClosestPointInStroke (simplistic implementation)
    getClosestPointInStroke(context: CanvasRenderingContext2D, radius: number): Point {
        const angle = Math.atan2(this.y - center.y, this.x - center.x);
        return new Point(
            Math.round(center.x + Math.cos(angle) * radius),
            Math.round(center.y + Math.sin(angle) * radius)
        );
    }

    // Placeholder for getColor (requires canvas context data)
    getColor(context: CanvasRenderingContext2D): Color {
      // In a real implementation, this would read pixel data from the canvas
      // For now, return a default Color based on position or a simple calculation
      const angle = Math.atan2(this.y - center.y, this.x - center.x) * (180 / Math.PI);
      const hue = (angle + 360) % 360;
      return new Color(hue, 100, 50); // HSL approximation
    }
}

// Placeholder for Color class:
export class Color {
    constructor(public r: number, public g: number, public b: number) {}
    
    getHexCode(): string {
        return `#${toHex(this.r)}${toHex(this.g)}${toHex(this.b)}`;
    }
    
    // Simple static method to create Color from HSL (for the getColor placeholder)
    static fromHsl(h: number, s: number, l: number): Color {
      // Very basic placeholder conversion logic for demo purposes
      return new Color(h % 255, s % 255, l % 255);
    }
}
const center = new Point(0, 0); // Global center needed for placeholder methods
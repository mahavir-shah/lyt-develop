import { Color } from './color';

export class Point {
  public x: number;
  public y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  public distanceTo(point: Point): number {
    return Math.sqrt((this.x - point.x) ** 2 + (this.y - point.y) ** 2);
  }

  public isInStroke(
    context: CanvasRenderingContext2D,
    center: Point,
    radius: number,
    distance: number = 1
  ): boolean {
    return Math.abs(this.distanceTo(center) - radius) < distance;
  }

  public getClosestPointInStroke(
    context: CanvasRenderingContext2D,
    radius: number
  ): Point {
    const center = new Point(
      Math.round(context.canvas.width / 2),
      Math.round(context.canvas.height / 2)
    );
    const angle = Math.atan2(this.y - center.y, this.x - center.x);

    return new Point(
      Math.round(center.x + Math.cos(angle) * radius),
      Math.round(center.y + Math.sin(angle) * radius)
    );
  }

  public getColor(context: CanvasRenderingContext2D): Color {
    const data = context.getImageData(this.x, this.y, 1, 1).data;
    return new Color(data[0], data[1], data[2]);
  }
}

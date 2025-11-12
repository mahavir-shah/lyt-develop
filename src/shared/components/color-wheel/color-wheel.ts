// color-wheel.component.ts
import { Component, Output, ViewChild, EventEmitter, ElementRef, OnInit, AfterViewInit } from '@angular/core';
import { Point } from './point';
import { Color } from './color';

const EVENT = {
  START: 'pointerdown',
  MOVE: 'pointermove',
  STOP: 'pointerup'
};

function getPixelRatio(context: CanvasRenderingContext2D): number {
  return window.devicePixelRatio || 1;
}

@Component({
  selector: 'color-wheel',
  templateUrl: './color-wheel.html',
  // styleUrls: ['./color-wheel.scss'],
  standalone: false
})
export class ColorWheel implements OnInit, AfterViewInit {
  @Output() didRelease = new EventEmitter<boolean>();
  @Output() colorDidChange = new EventEmitter<Color>();
  @Output() leftSliderDidChange = new EventEmitter<number>();
  @Output() rightSliderDidChange = new EventEmitter<number>();

  @ViewChild('colorWheel', { static: false }) colorWheel!: ElementRef<HTMLCanvasElement>;

  private leftSliderValue: number = 100;
  private rightSliderValue: number = 100;
  private color!: Color;
  private colorWheelPoint!: Point;
  private colorSelector: HTMLElement | null = null;
  private colorSelectorBackground: HTMLElement | null = null;
  private center!: Point;
  private radius: number = 0;
  private pixelRatio: number = 1;
  private didTapSelector: boolean = false;
  private context!: CanvasRenderingContext2D;
  private offScreenColorWheelCanvas!: HTMLCanvasElement;
  private offScreenColorWheelContext!: CanvasRenderingContext2D;

  ngOnInit(): void { }

  ngAfterViewInit(): void {
    this.initialize();
  }

  private initialize(): void {
    this.initializeColorWheel();
  }

  private initializeColorWheel(): void {
    const canvasColorWheel = this.colorWheel.nativeElement;
    canvasColorWheel.style.touchAction = 'none';
    this.context = canvasColorWheel.getContext('2d')!;

    this.colorSelector = document.getElementById('color-selector');
    this.colorSelectorBackground = document.getElementById('color-selector-background');

    const width = window.innerWidth;
    const height = width * 0.75;

    this.pixelRatio = getPixelRatio(this.context);

    this.context.canvas.width = width * this.pixelRatio;
    this.context.canvas.height = height * this.pixelRatio;
    this.context.canvas.style.width = width + 'px';
    this.context.canvas.style.height = height + 'px';

    this.center = new Point(
      Math.round(this.context.canvas.width / 2),
      Math.round(this.context.canvas.height / 2)
    );
    this.radius = 100 * this.pixelRatio;

    this.offScreenColorWheelCanvas = document.createElement('canvas');
    this.offScreenColorWheelCanvas.width = canvasColorWheel.width;
    this.offScreenColorWheelCanvas.height = canvasColorWheel.height;
    this.offScreenColorWheelContext = this.offScreenColorWheelCanvas.getContext('2d')!;

    this.drawColorWheel();
    this.renderColorWheel();
    this.setRandomInitialPosition();
    this.update();

    this.leftSliderDidChange.emit(100);
    this.rightSliderDidChange.emit(100);

    const onMove = (event: PointerEvent) => {
      this.colorWheelPoint = this.getPointFromTouch(event);
      
      if (!this.colorWheelPoint.isInStroke(this.context, this.center, this.radius)) {
        this.colorWheelPoint = this.colorWheelPoint.getClosestPointInStroke(this.context, this.radius);
      }

      this.color = this.colorWheelPoint.getColor(this.context);
      this.colorDidChange.emit(this.color);

      const update = () => {
        if (this.colorSelector && this.colorSelectorBackground) {
          this.colorSelector.style.transform =
            'translate(' +
            this.colorWheelPoint.x / this.pixelRatio +
            'px,' +
            this.colorWheelPoint.y / this.pixelRatio +
            'px)';
          this.colorSelectorBackground.style.background = this.color.getHexCode();
        }
      };

      requestAnimationFrame(update);
    };

    const onLeftSliderChange = (event: PointerEvent) => {
      const angle = this.calculateAngleFromTouch(event);
      let newValue: number = this.leftSliderValue;

      if (angle > 0) {
        if (angle < 137.5) newValue = 10;
        else if (angle < 146.5) newValue = 20;
        else if (angle < 156.5) newValue = 30;
        else if (angle < 166) newValue = 40;
        else if (angle < 175) newValue = 50;
      } else {
        if (angle < -175) newValue = 60;
        else if (angle < -165) newValue = 70;
        else if (angle < -156) newValue = 80;
        else if (angle < -147) newValue = 90;
        else newValue = 100;
      }

      if (newValue !== this.leftSliderValue) {
        this.leftSliderValue = newValue;
        this.leftSliderDidChange.emit(newValue);
      }
    };

    const onRightSliderChange = (event: PointerEvent) => {
      const angle = this.calculateAngleFromTouch(event);
      let newValue: number = this.rightSliderValue;

      if (angle > 0) {
        if (angle > 43) newValue = 10;
        else if (angle > 33) newValue = 20;
        else if (angle > 23.5) newValue = 30;
        else if (angle > 14.5) newValue = 40;
        else if (angle > 4.5) newValue = 50;
      } else {
        if (angle < -33.5) newValue = 100;
        else if (angle < -23.5) newValue = 90;
        else if (angle < -14.5) newValue = 80;
        else if (angle < -4.5) newValue = 70;
        else newValue = 60;
      }

      if (newValue !== this.rightSliderValue) {
        this.rightSliderValue = newValue;
        this.rightSliderDidChange.emit(newValue);
      }
    };

    canvasColorWheel.addEventListener(EVENT.START, (event: Event) => {
      event.preventDefault();
      const pointerEvent = event as PointerEvent;
      const point = this.getPointFromTouch(pointerEvent, false);

      if (point.distanceTo(this.colorWheelPoint) < 16 * this.pixelRatio) {
        this.didTapSelector = true;
        canvasColorWheel.addEventListener(EVENT.MOVE, onMove as EventListener);
        return;
      }

      this.didTapSelector = false;

      if (point.isInStroke(this.context, this.center, this.radius * 1.58, 100)) {
        const angle =
          Math.atan2(point.y - this.center.y, point.x - this.center.x) * (180 / Math.PI);

        if (this.isOnLeftSlider(angle)) {
          canvasColorWheel.addEventListener(EVENT.MOVE, onLeftSliderChange as EventListener);
        } else if (this.isOnRightSlider(angle)) {
          canvasColorWheel.addEventListener(EVENT.MOVE, onRightSliderChange as EventListener);
        }
      }
    });

    canvasColorWheel.addEventListener(EVENT.STOP, (event: Event) => {
      canvasColorWheel.removeEventListener(EVENT.MOVE, onLeftSliderChange as EventListener);
      canvasColorWheel.removeEventListener(EVENT.MOVE, onRightSliderChange as EventListener);

      if (this.didTapSelector) {
        this.didRelease.emit(true);
        canvasColorWheel.removeEventListener(EVENT.MOVE, onMove as EventListener);
        return;
      }
    });
  }

  public setColor(color: Color): void {
    this.color = color;
    if (this.colorSelectorBackground) {
      this.colorSelectorBackground.style.background = this.color.getHexCode();
    }
  }

  private renderColorWheel(): void {
    this.context.clearRect(0, 0, this.context.canvas.width, this.context.canvas.height);
    this.context.drawImage(this.offScreenColorWheelCanvas, 0, 0);
  }

  private update(): void {
    if (this.colorSelector && this.colorSelectorBackground) {
      this.colorSelector.style.transform =
        'translate(' +
        this.colorWheelPoint.x / this.pixelRatio +
        'px,' +
        this.colorWheelPoint.y / this.pixelRatio +
        'px)';
      this.colorSelectorBackground.style.background = this.color.getHexCode();
    }
  }

  private setRandomInitialPosition(): void {
    this.colorWheelPoint = this.getRandomPointOnWheel();
    this.color = this.colorWheelPoint.getColor(this.context);
    this.colorDidChange.emit(this.color);
  }

  private drawColorWheel(): void {
    for (let angle = 1; angle <= 360; angle++) {
      const startAngle = (angle - 2) * (Math.PI / 180);
      const endAngle = angle * (Math.PI / 180);

      this.offScreenColorWheelContext.beginPath();
      this.offScreenColorWheelContext.arc(
        this.center.x,
        this.center.y,
        this.radius,
        startAngle,
        endAngle,
        false
      );
      this.offScreenColorWheelContext.closePath();

      this.offScreenColorWheelContext.lineWidth = 6 * this.pixelRatio;
      this.offScreenColorWheelContext.strokeStyle = 'hsl(' + angle + ', 100%, 50%)';
      this.offScreenColorWheelContext.stroke();
    }
  }

  private getPointFromTouch(event: PointerEvent, shouldChangeColorWheelPoint: boolean = true): Point {
    const boundingRect = this.context.canvas.getBoundingClientRect();
    const touch = this.calculatePointOnScreen(event);

    const x = Math.round((touch.x - boundingRect.left) * this.pixelRatio);
    const y = Math.round((touch.y - boundingRect.top) * this.pixelRatio);

    if (shouldChangeColorWheelPoint && this.colorWheelPoint) {
      this.colorWheelPoint.x = x;
      this.colorWheelPoint.y = y;
    }

    return new Point(x, y);
  }

  private calculatePointOnScreen(event: PointerEvent): Point {
    return new Point(event.clientX, event.clientY);

    /* return new Point(
      event.pageX || (event as any).changedTouches?.[0]?.pageX || (event as any).changedTouches?.[0]?.screenX || event.clientX,
      event.pageY || (event as any).changedTouches?.[0]?.pageY || (event as any).changedTouches?.[0]?.screenY || event.clientY
    ); */
  }

  private calculateAngleFromTouch(event: PointerEvent): number {
    const point = this.getPointFromTouch(event, false);
    return Math.atan2(point.y - this.center.y, point.x - this.center.x) * (180 / Math.PI);
  }

  private isOnLeftSlider(angle: number): boolean {
    return angle <= -140 || (angle >= 130 && angle <= 180);
  }

  private isOnRightSlider(angle: number): boolean {
    return angle >= -40 && angle <= 50;
  }

  private getRandomPointOnWheel(): Point {
    const randomAngle = Math.random() * 361;
    return new Point(
      Math.round(this.center.x + Math.cos(randomAngle) * this.radius),
      Math.round(this.center.y + Math.sin(randomAngle) * this.radius)
    );
  }
}
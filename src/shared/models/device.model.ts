import {
  BleClient,
  BleDevice,
  numberToUUID,
  ScanResult,
  BleService
} from '@capacitor-community/bluetooth-le';
import { Color } from './../components/color-wheel/color';
import { BaseModel } from './base.model';
import { DevicesService } from './../services/devices.service'

interface AnimationOptions {
  type?: 'pulse' | 'wave' | 'strobe' | 'mix' | 'none';
  speed?: number; // 0-100
  brightness?: number; // 0-255
}

const DEVICE_SERVICE_UUID = '0000fff0-0000-1000-8000-00805f9b34fb';
const CHARACTERISTIC_UUID = {
  BRIGHTNESS: '0000fff3-0000-1000-8000-00805f9b34fb',
  COLOR: '0000fff5-0000-1000-8000-00805f9b34fb',
  SATURATION: '0000fff6-0000-1000-8000-00805f9b34fb',
};

export class Device extends BaseModel {
  public deviceId: string = '';
  public device: any = '';
  public name: string = '';
  public rssi: number = 0;
  public localName: string = '';
  public uuids: string[] = [];
  public manufacturerData: string = '';
  public serviceData: any = {};
  public color: Color = new Color(255, 0, 0);
  public currentAnimation: AnimationOptions = { type: 'none' };
  private stopFlag = false;

  constructor(
    deviceData?: Partial<Device>,
    private deviceService?: DevicesService
  ) {
    console.log("deviceData:", deviceData)
    super(deviceData || {}); // Pass deviceData or empty object to BaseModel constructor
    if (deviceData) {
      Object.assign(this, deviceData);
    }
  }

  public stop() {
    this.stopFlag = true;
  }

  /**
   * Connect to the BLE device
   */
  public async connect(): Promise<any> {
    try {
      const result = await BleClient.connect(this.device.deviceId);
      await this.delay(500);
      await this.getCharacteristics(DEVICE_SERVICE_UUID);
      console.log(`Connected to device: ${this.device.name}`);

      this.writeColor(this.color);
      this.deviceService.devices = [];
      console.log("device list clear current value for device list:", this.deviceService?.devices)
      return result;
    } catch (error) {
      return error;
    }
  }

  /**
   * Disconnect from the BLE device
   */
  public async disconnect(): Promise<void> {
    try {
      await BleClient.disconnect(this.device.deviceId);
      console.log(`Disconnected from device: ${this.name}`);
    } catch (error) {
      console.error('Disconnection failed:', error);
      throw error;
    }
  }

  /**
   * Flash the device by changing brightness levels
   */
  public async flash(previousBrightnessLevel: number = 100): Promise<void> {
    try {
      if (!(await this.isConnected())) {
        await BleClient.connect(this.device.deviceId);
        await this.delay(500); // Increased delay after connection
      }

      console.log('Setting brightness to 100%');
      await this.changeBrightnessLevel(100);
      await this.delay(300); // Increased delay to ensure device processes command

      console.log('Setting brightness to 0%');
      await this.changeBrightnessLevel(0);
      await this.delay(300);

      console.log(`Restoring brightness to ${previousBrightnessLevel}%`);
      await this.changeBrightnessLevel(previousBrightnessLevel);
    } catch (error) {
      console.error('Flash operation failed:', error);
      throw error;
    }
  }

  /**
   * Change device brightness level
   */
  public async changeBrightnessLevel(value: number): Promise<void> {
    try {
      // Ensure connection
      if (!(await this.isConnected())) {
        throw new Error('Device not connected');
      }

      // 1. Create a new ArrayBuffer to hold the data
      const buffer = new ArrayBuffer(1); // 1 byte for brightness value
      // 2. Create a DataView to write to the buffer
      const dataView = new DataView(buffer);
      // 3. Write the desired brightness value (e.g., 75) as an 8-bit unsigned integer (Uint8)
      // NOTE: Adjust '75' and the length of the buffer based on what your device expects.
      dataView.setUint8(0, value);

      await BleClient.write(
        this.device.deviceId,
        DEVICE_SERVICE_UUID,
        CHARACTERISTIC_UUID.BRIGHTNESS,
        dataView
      );

      console.log('Brightness command sent successfully');
      // Small delay to let device process
      await this.delay(100);
    } catch (error) {
      console.error('Change brightness failed:', error);
      throw error;
    }
  }

  /**
   * Use color blending to simulate brightness
   */
  public async setLedBrightness(percent: number, color: Color) {
    const scale = percent / 100;
    const r = Math.floor(color.r * scale);
    const g = Math.floor(color.g * scale);
    const b = Math.floor(color.b * scale);
    await this.writeRGBColor(r, g, b);
    console.log('Updated the LED brightness to scale, r, g, b', scale, r, g, b);
  }

  private applySaturation(r: number, g: number, b: number, saturation: number) {
    // saturation = 0 → gray; saturation = 1 → full color
    const gray = (r + g + b) / 3;
    const newR = Math.round(gray + (r - gray) * saturation);
    const newG = Math.round(gray + (g - gray) * saturation);
    const newB = Math.round(gray + (b - gray) * saturation);
    return [newR, newG, newB];
  }

  public async setSaturationLevel(percent: number, baseColor: Color) {
    const saturation = Math.max(0, Math.min(1, percent / 100)); // clamp 0–1
    const [r, g, b] = this.applySaturation(baseColor.r, baseColor.g, baseColor.b, saturation);
    await this.writeRGBColor(r, g, b);
    console.log('Updated the saturation to scale, r, g, b', saturation, r, g, b);
  }

  public async applyBrightnessAndSaturation(baseColor: Color, brightness: number, saturation: number) {
    // Brightness scaling first
    const br = baseColor.r * brightness;
    const bg = baseColor.g * brightness;
    const bb = baseColor.b * brightness;

    // Then apply saturation
    const gray = (br + bg + bb) / 3;
    const newR = Math.round(gray + (br - gray) * saturation);
    const newG = Math.round(gray + (bg - gray) * saturation);
    const newB = Math.round(gray + (bb - gray) * saturation);
    await this.writeRGBColor(newR, newG, newB);
  }

  /**
   * Write to a specific characteristic
   */
  public async writeCharacteristic(characteristicUUID: string, value: any): Promise<void> {
    try {
      let dataView: DataView;

      if (Array.isArray(value)) {
        dataView = new DataView(new ArrayBuffer(Math.max(5, value.length)));
        for (let i = 0; i < value.length; i++) {
          dataView.setUint8(i, typeof value[i] === 'number' ? scaleValue(value[i]) : value[i] || 0);
        }
      } else {
        dataView = new DataView(new ArrayBuffer(1));
        dataView.setUint8(0, typeof value === 'number' ? scaleValue(value) : value);
      }

      await BleClient.write(
        this.device.deviceId,
        DEVICE_SERVICE_UUID,
        characteristicUUID,
        dataView
      );
    } catch (error) {
      console.error('Write characteristic failed:', error);
      throw error;
    }
  }

  /**
   * Read from a specific characteristic
   */
  public async readCharacteristic(characteristicUUID: string): Promise<DataView> {
    try {
      const result = await BleClient.read(
        this.device.deviceId,
        DEVICE_SERVICE_UUID,
        characteristicUUID
      );

      return result;
    } catch (error) {
      console.error('Read characteristic failed:', error);
      throw error;
    }
  }

  /**
   * Check if device is connected
   */
  public async isConnected(): Promise<boolean> {
    try {
      const connectedDevices = await BleClient.getConnectedDevices([DEVICE_SERVICE_UUID]);
      return connectedDevices.some(device => device.deviceId === this.device.deviceId);
    } catch (error) {
      console.error('Check connection status failed:', error);
      return false;
    }
  }

  /**
   * Get device services
   */
  public async getServices(): Promise<BleService[]> {
    try {
      const services = await BleClient.getServices(this.device.deviceId);
      return services;
    } catch (error) {
      console.error('Get services failed:', error);
      throw error;
    }
  }

  /**
   * Get device characteristics for a service
   */
  public async getCharacteristics(serviceUUID: string): Promise<any[]> {
    try {
      const services = await BleClient.getServices(this.device.deviceId);
      const targetService = services.find(service => service.uuid === serviceUUID);
      console.log('XXXX - ', targetService?.characteristics);
      return targetService?.characteristics || [];
    } catch (error) {
      console.error('Get characteristics failed:', error);
      throw error;
    }
  }

  /**
   * Initialize BLE client (call this before using BLE operations)
   */
  public static async initialize(): Promise<void> {
    try {
      await BleClient.initialize({
        androidNeverForLocation: true
      });
      console.log('BLE Client initialized');
    } catch (error) {
      console.error('BLE initialization failed:', error);
      throw error;
    }
  }

  /**
   * Request BLE permissions (Android/iOS)
   * Note: This method requests permissions by briefly starting and stopping a scan
   */
  public static async requestPermissions(): Promise<void> {
    try {
      // Start a brief scan to trigger permission request
      await BleClient.requestLEScan(
        {
          allowDuplicates: false,
        },
        () => {
          // Empty callback - we're just requesting permissions
        }
      );

      // Immediately stop the scan as we only wanted permissions
      await BleClient.stopLEScan();
      console.log('BLE permissions granted');
    } catch (error) {
      console.error('BLE permission request failed:', error);
      throw error;
    }
  }

  /**
   * Start scanning for BLE devices
   */
  public static async startScan(
    callback: (result: ScanResult) => void,
    options?: {
      services?: string[];
      name?: string;
      namePrefix?: string;
      allowDuplicates?: boolean;
    }
  ): Promise<void> {
    try {
      await BleClient.requestLEScan(
        {
          services: options?.services,
          name: options?.name,
          namePrefix: options?.namePrefix,
          allowDuplicates: options?.allowDuplicates || false,
        },
        callback
      );
      console.log('BLE scan started');
    } catch (error) {
      console.error('BLE scan failed:', error);
      throw error;
    }
  }

  /**
   * Stop scanning for BLE devices
   */
  public static async stopScan(): Promise<void> {
    try {
      await BleClient.stopLEScan();
      console.log('BLE scan stopped');
    } catch (error) {
      console.error('Stop BLE scan failed:', error);
      throw error;
    }
  }

  /**
   * Create Device instance from ScanResult
   */
  public static fromScanResult(scanResult: ScanResult): Device {
    return new Device({
      deviceId: scanResult.device?.deviceId || '',
      name: scanResult.device?.name || scanResult.localName || 'Unknown Device',
      rssi: scanResult.rssi || 0,
      localName: scanResult.localName || '',
      uuids: scanResult.uuids || [],
      manufacturerData: JSON.stringify(scanResult.manufacturerData) || '',
      serviceData: scanResult.serviceData || {}
    });
  }

  /**
   * Utility method for delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // -----------------------------------------------------------
  // 1️⃣ Pulse Effect: fade in/out smoothly
  // -----------------------------------------------------------
  public async pulse(baseColor: Color, duration = 400, cycles = 3) {
    this.stopFlag = false;
    const steps = 40;
    const startTime = Date.now();
    const totalSteps = cycles * 2 * steps;

    let currentStep = 0;

    for (let c = 0; c < cycles && !this.stopFlag; c++) {
      // Fade in
      for (let i = 0; i <= steps && !this.stopFlag; i++) {
        const scale = i / steps;
        const [r, g, b] = [baseColor.r, baseColor.g, baseColor.b].map(v => Math.round(v * scale));
        await this.writeRGBColor(r, g, b);

        // Calculate timing to stay on schedule
        currentStep++;
        const elapsedTime = Date.now() - startTime;
        const targetTime = (currentStep / totalSteps) * duration;
        const waitTime = Math.max(0, targetTime - elapsedTime);

        await this.delay(waitTime);
      }
      // Fade out
      for (let i = steps; i >= 0 && !this.stopFlag; i--) {
        const scale = i / steps;
        const [r, g, b] = [baseColor.r, baseColor.g, baseColor.b].map(v => Math.round(v * scale));
        await this.writeRGBColor(r, g, b);

        currentStep++;
        const elapsedTime = Date.now() - startTime;
        const targetTime = (currentStep / totalSteps) * duration;
        const waitTime = Math.max(0, targetTime - elapsedTime);

        await this.delay(waitTime);
      }
    }
  }

  // -----------------------------------------------------------
  // 2️⃣ Wave Effect: smooth color wave using sinusoidal brightness
  // -----------------------------------------------------------
  public async wave(baseColor: Color, duration = 400, steps = 50) {
    this.stopFlag = false;
    const startTime = Date.now();
    const stepDuration = duration / steps;

    for (let i = 0; i < steps && !this.stopFlag; i++) {
      const t = (i / steps) * 2 * Math.PI; // 0 to 2π
      const scale = (Math.sin(t) + 1) / 2; // 0 to 1
      const [r, g, b] = [baseColor.r, baseColor.g, baseColor.b].map(v => Math.round(v * scale));
      await this.writeRGBColor(r, g, b);
      // Calculate how long to wait to stay on schedule
      const elapsedTime = Date.now() - startTime;
      const targetTime = (i + 1) * stepDuration;
      const waitTime = Math.max(0, targetTime - elapsedTime);
      await this.delay(waitTime);
    }
  }

  // -----------------------------------------------------------
  // 3️⃣ Probe Effect: strong pulse, short fade, like a sonar ping
  // -----------------------------------------------------------
  public async probe(baseColor: Color, flashes = 5) {
    this.stopFlag = false;

    for (let i = 0; i < flashes && !this.stopFlag; i++) {
      // Bright pulse
      await this.writeColor(baseColor);
      await this.delay(150);

      // Rapid fade out
      for (let j = 4; j >= 0 && !this.stopFlag; j--) {
        const scale = j / 4;
        const [r, g, b] = [baseColor.r, baseColor.g, baseColor.b].map(v => Math.round(v * scale));
        await this.writeRGBColor(r, g, b);
        await this.delay(50);
      }

      await this.delay(200);
    }
  }

  // -----------------------------------------------------------
  // 4️⃣ Strobe Effect: quick on/off flashes
  // -----------------------------------------------------------
  public async strobe(baseColor: Color, duration = 400, frequency = 5) {
    this.stopFlag = false;
    const startTime = Date.now();
    const interval = duration / frequency; // ms per flash
    const totalFlashes = frequency * 2; // on + off = 2 actions per flash

    let currentFlash = 0;

    while (currentFlash < totalFlashes && !this.stopFlag) {
      // Determine if this is an "on" or "off" phase
      const isOn = currentFlash % 2 === 0;

      if (isOn) {
        await this.writeRGBColor(0, 0, 0); // off
      } else {
        await this.writeColor(baseColor); // on
      }

      // Calculate timing to stay on schedule
      currentFlash++;
      const elapsedTime = Date.now() - startTime;
      const targetTime = (currentFlash / totalFlashes) * duration;
      const waitTime = Math.max(0, targetTime - elapsedTime);

      await this.delay(waitTime);
    }
  }

  // -----------------------------------------------------------
  // 5️⃣ Mix Effect: combines pulse, strobe, and wave patterns
  // -----------------------------------------------------------
  public async mix(baseColor: Color, duration = 400) {
    this.stopFlag = false;
    const startTime = Date.now();

    // Define color transitions for the mix effect
    // We'll cycle through variations of the base color
    const baseColors: [number, number, number][] = [
      [baseColor.r, baseColor.g, baseColor.b],           // Original color
      [baseColor.b, baseColor.r, baseColor.g],           // Rotate RGB
      [baseColor.g, baseColor.b, baseColor.r],           // Rotate RGB again
      [baseColor.r, baseColor.g, baseColor.b]            // Back to original
    ];

    const steps = 20; // Steps per color transition
    const totalTransitions = baseColors.length - 1;
    const totalSteps = totalTransitions * steps;

    let currentStep = 0;

    // Loop through pairs of colors
    for (let c = 0; c < totalTransitions && !this.stopFlag; c++) {
      const from = baseColors[c];
      const to = baseColors[c + 1];

      // Blend from one color to the next
      for (let i = 0; i <= steps && !this.stopFlag; i++) {
        const t = i / steps; // 0 → 1 blend factor
        const r = Math.round(from[0] + (to[0] - from[0]) * t);
        const g = Math.round(from[1] + (to[1] - from[1]) * t);
        const b = Math.round(from[2] + (to[2] - from[2]) * t);

        await this.writeRGBColor(r, g, b);

        // Calculate timing to stay on schedule
        currentStep++;
        const elapsedTime = Date.now() - startTime;
        const targetTime = (currentStep / totalSteps) * duration;
        const waitTime = Math.max(0, targetTime - elapsedTime);

        await this.delay(waitTime);
      }
    }
  }

  public async writeColor(color: Color) {
    await this.writeRGBColor(color.r, color.g, color.b);
  }

  private async writeRGBColor(r: number, g: number, b: number) {
    const data = new Uint8Array([r, g, b, 0, 0]);
    try {
      await BleClient.write(
        this.device.deviceId,
        DEVICE_SERVICE_UUID,
        CHARACTERISTIC_UUID.COLOR,
        new DataView(data.buffer)
      );
    } catch (err) {
      console.warn('BLE writeColor error:', err);
    }
  }
}

// Utility functions
function scaleValue(value: number): number {
  // Ensure value is between 0 and 255, then scale to 0-254
  const clampedValue = Math.max(0, Math.min(255, value));
  return Math.floor((clampedValue * 254) / 255);
}

function scaleColor(color: Color): Color {
  return new Color(
    scaleValue(color.r),
    scaleValue(color.g),
    scaleValue(color.b)
  );
}
// Export for use in other components
export { BleClient, BleDevice, ScanResult } from '@capacitor-community/bluetooth-le';

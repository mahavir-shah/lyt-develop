// device.model.ts
import {
  BleClient,
  BleDevice,
  ScanResult,
  BleService
} from '@capacitor-community/bluetooth-le';

import { Color } from './../components/color-wheel/color';
import { BaseModel } from './base.model';
import { DevicesService } from './../services/devices.service';

const DEVICE_SERVICE_UUID = '0000fff0-0000-1000-8000-00805f9b34fb';
const CHARACTERISTIC_UUID = {
  BRIGHTNESS: '0000fff3-0000-1000-8000-00805f9b34fb',
  COLOR: '0000fff5-0000-1000-8000-00805f9b34fb',
  ARMS: '0000fff6-0000-1000-8000-00805f9b34fb',
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

  constructor(
    deviceData?: Partial<Device>,
    private deviceService?: DevicesService
  ) {
    super(deviceData || {});
    if (deviceData) Object.assign(this, deviceData);
  }

  // ---------------------------------------------------------
  // BLE CONNECTION
  // ---------------------------------------------------------

  public async connect(): Promise<any> {
    try {
      const result = await BleClient.connect(this.device.deviceId);
      await this.delay(400);

      await this.getCharacteristics(DEVICE_SERVICE_UUID);

      // restore last color
      //await this.writeColor(this.color);
      return result;
    } catch (error) {
      console.error("Connection failed:", error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await BleClient.disconnect(this.device.deviceId);
    } catch (error) {
      console.error('Disconnection failed:', error);
      throw error;
    }
  }

  // ---------------------------------------------------------
  // BASIC RGB COLOR WRITE
  // ---------------------------------------------------------

  public async writeArmColor(arm1: Color, arm2: Color, arm3: Color, arm4: Color) {
    let armsColors = [arm1, arm2, arm3, arm4];
    await this.writeRGBColorForArms(armsColors);
  }

  public async writeAllArmsColor(arms: Color[]) {
    let armsColors = [];
    if (arms.length < 4) {
      const paddingCount = 4 - arms.length;
      armsColors = [
        ...arms,
        ...new Array(paddingCount).fill(new Color(0, 0, 0))
      ];
    } else {
      armsColors = arms;
    }
    await this.writeRGBColorForArms(armsColors);
  }

  public async writeAllArmsColorWithoutResponse(arms: Color[]) {
    let armsColors = [];
    if (arms.length < 4) {
      const paddingCount = 4 - arms.length;
      armsColors = [
        ...arms,
        ...new Array(paddingCount).fill(new Color(0, 0, 0))
      ];
    } else {
      armsColors = arms;
    }
    await this.writeRGBColorForArmsWithoutResponse(armsColors);
  }

  private async writeRGBColorForArms(arms: Color[]) {
    if (arms.length !== 4) {
      console.error("writeRGBColorForArms must be called with exactly 4 Color objects.");
      return;
    }
    // A single loop to populate the 12-byte buffer
    const colorBuffer = new Uint8Array(12);
    arms.forEach((arm, i) => {
      // The starting index for the current arm (0, 3, 6, 9)
      const idx = i * 3;
      // Helper to clip and round the color value
      const clip = (val: number) => Math.max(0, Math.min(255, Math.round(val)));
      // Assign R, G, B directly
      colorBuffer[idx] = clip(arm.r);
      colorBuffer[idx + 1] = clip(arm.g);
      colorBuffer[idx + 2] = clip(arm.b);
    });

    console.log('writeRGBColorForArms - ', colorBuffer);
    try {
      // ... BLE write logic remains the same
      await BleClient.write(
        this.device.deviceId,
        DEVICE_SERVICE_UUID,
        CHARACTERISTIC_UUID.ARMS,
        new DataView(colorBuffer.buffer)
      );
    } catch (err) {
      console.warn('BLE writeColor error:', err);
    }
  }

  private async writeRGBColorForArmsWithoutResponse(arms: Color[]) {
    if (arms.length !== 4) {
      console.error("writeRGBColorForArmsWithoutResponse must be called with exactly 4 Color objects.");
      return;
    }
    // A single loop to populate the 12-byte buffer
    const colorBuffer = new Uint8Array(12);
    arms.forEach((arm, i) => {
      // The starting index for the current arm (0, 3, 6, 9)
      const idx = i * 3;
      // Helper to clip and round the color value
      const clip = (val: number) => Math.max(0, Math.min(255, Math.round(val)));
      // Assign R, G, B directly
      colorBuffer[idx] = clip(arm.r);
      colorBuffer[idx + 1] = clip(arm.g);
      colorBuffer[idx + 2] = clip(arm.b);
    });

    console.log('writeRGBColorForArmsWithoutResponse - ', colorBuffer);
    try {
      // ... BLE write logic remains the same
      await BleClient.writeWithoutResponse(
        this.device.deviceId,
        DEVICE_SERVICE_UUID,
        CHARACTERISTIC_UUID.ARMS,
        new DataView(colorBuffer.buffer)
      );
    } catch (err) {
      console.warn('BLE writeColor error:', err);
    }
  }

  public async writeColor(color: Color) {
    this.color = color;
    await this.writeRGBColor(color.r, color.g, color.b);
  }

  public async writeRGBColor(r: number, g: number, b: number) {
    const rr = Math.max(0, Math.min(255, Math.round(r)));
    const gg = Math.max(0, Math.min(255, Math.round(g)));
    const bb = Math.max(0, Math.min(255, Math.round(b)));

    const data = new Uint8Array([rr, gg, bb, 0, 0]);
    console.log('[iOS BLE] writeRGBColor CALLED at', performance.now().toFixed(2));
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

  public async writeRGBColorWithoutResponse(r: number, g: number, b: number) {
    const rr = Math.max(0, Math.min(255, Math.round(r)));
    const gg = Math.max(0, Math.min(255, Math.round(g)));
    const bb = Math.max(0, Math.min(255, Math.round(b)));

    const data = new Uint8Array([rr, gg, bb, 0, 0]);

    try {
      await BleClient.writeWithoutResponse(
        this.device.deviceId,
        DEVICE_SERVICE_UUID,
        CHARACTERISTIC_UUID.COLOR,
        new DataView(data.buffer)
      );
    } catch (err) {
      console.warn('BLE writeColor error:', err);
    }
  }

  // ---------------------------------------------------------
  // BRIGHTNESS & SATURATION
  // ---------------------------------------------------------

  public async changeBrightnessLevel(value: number): Promise<void> {
    try {
      if (!(await this.isConnected())) throw new Error('Device not connected');

      const buffer = new ArrayBuffer(1);
      const dataView = new DataView(buffer);
      dataView.setUint8(0, value);

      await BleClient.write(
        this.device.deviceId,
        DEVICE_SERVICE_UUID,
        CHARACTERISTIC_UUID.BRIGHTNESS,
        dataView
      );

      await this.delay(80);
    } catch (error) {
      console.error('Brightness failed:', error);
    }
  }

  public async setLedBrightness(percent: number, color: Color) {
    const scale = percent / 100;
    const r = Math.floor(color.r * scale);
    const g = Math.floor(color.g * scale);
    const b = Math.floor(color.b * scale);
    await this.writeRGBColor(r, g, b);
  }

  private applySaturation(r: number, g: number, b: number, saturation: number) {
    const gray = (r + g + b) / 3;
    return [
      Math.round(gray + (r - gray) * saturation),
      Math.round(gray + (g - gray) * saturation),
      Math.round(gray + (b - gray) * saturation),
    ];
  }

  public async setSaturationLevel(percent: number, baseColor: Color) {
    const saturation = Math.max(0, Math.min(1, percent / 100));
    const [r, g, b] = this.applySaturation(baseColor.r, baseColor.g, baseColor.b, saturation);
    await this.writeRGBColor(r, g, b);
  }

  public async applyBrightnessAndSaturation(baseColor: Color, brightness: number, saturation: number) {
    const br = baseColor.r * brightness;
    const bg = baseColor.g * brightness;
    const bb = baseColor.b * brightness;

    const gray = (br + bg + bb) / 3;
    const newR = Math.round(gray + (br - gray) * saturation);
    const newG = Math.round(gray + (bg - gray) * saturation);
    const newB = Math.round(gray + (bb - gray) * saturation);

    await this.writeRGBColor(newR, newG, newB);
  }

  public async flash(previousBrightnessLevel: number = 100): Promise<void> {
    try {
      if (!(await this.isConnected())) {
        await BleClient.connect(this.device.deviceId);
        await this.delay(200);
      }

      // Flash sequence: full → off → original
      await this.changeBrightnessLevel(100);
      await this.delay(150);

      await this.changeBrightnessLevel(0);
      await this.delay(150);

      await this.changeBrightnessLevel(previousBrightnessLevel);
    } catch (error) {
      console.error('Flash operation failed:', error);
    }
  }

  // ---------------------------------------------------------
  // BLE UTILITY
  // ---------------------------------------------------------

  public async writeCharacteristic(characteristicUUID: string, value: any): Promise<void> {
    try {
      let dataView: DataView;

      if (Array.isArray(value)) {
        dataView = new DataView(new ArrayBuffer(value.length));
        value.forEach((v, i) => dataView.setUint8(i, v));
      } else {
        dataView = new DataView(new ArrayBuffer(1));
        dataView.setUint8(0, value);
      }

      await BleClient.write(
        this.device.deviceId,
        DEVICE_SERVICE_UUID,
        characteristicUUID,
        dataView
      );
    } catch (error) {
      console.error('Write characteristic failed:', error);
    }
  }

  public async readCharacteristic(characteristicUUID: string): Promise<DataView> {
    return await BleClient.read(
      this.device.deviceId,
      DEVICE_SERVICE_UUID,
      characteristicUUID
    );
  }

  public async isConnected(): Promise<boolean> {
    try {
      const devices = await BleClient.getConnectedDevices([DEVICE_SERVICE_UUID]);
      return devices.some(d => d.deviceId === this.device.deviceId);
    } catch {
      return false;
    }
  }

  public async getServices(): Promise<BleService[]> {
    return await BleClient.getServices(this.device.deviceId);
  }

  public async getCharacteristics(serviceUUID: string): Promise<any[]> {
    const services = await BleClient.getServices(this.device.deviceId);
    console.log('[BLE DEBUG] Services discovered:', services);

    const characteristics =
      services.find(s => s.uuid === serviceUUID)?.characteristics || [];

    // Log all characteristics + their properties (VERY IMPORTANT on iOS)
    console.log('[BLE DEBUG] Characteristics for service:', serviceUUID);
    characteristics.forEach(c => {
      console.log('[BLE DEBUG] Characteristic:', {
        uuid: c.uuid,
        properties: c.properties,
        hasWrite: c.properties?.write,
        hasWriteWithoutResponse: c.properties?.writeWithoutResponse
      });
    });
    return characteristics;
  }

  private delay(ms: number) {
    return new Promise(res => setTimeout(res, ms));
  }

  // ---------------------------------------------------------
  // STATIC HELPERS
  // ---------------------------------------------------------

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

  public static async initialize(): Promise<void> {
    await BleClient.initialize({ androidNeverForLocation: true });
  }

  public static async requestPermissions(): Promise<void> {
    await BleClient.requestLEScan({ allowDuplicates: false }, () => { });
    await BleClient.stopLEScan();
  }

  public static async startScan(
    callback: (result: ScanResult) => void,
    options?: any
  ): Promise<void> {
    await BleClient.requestLEScan(options || {}, callback);
  }

  public static async stopScan(): Promise<void> {
    await BleClient.stopLEScan();
  }
}

export { BleClient, BleDevice, ScanResult };

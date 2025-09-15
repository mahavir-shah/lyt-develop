import { Injectable, inject } from '@angular/core';
import { BleClient, BleDevice, numberToUUID, ScanResult } from '@capacitor-community/bluetooth-le';
import { Color } from './../components/color-wheel/color';
import { BaseModel } from './base.model';

const DEVICE_SERVICE_UUID = 'fff0';
const CHARACTERISTIC_UUID = { 
  BRIGHTNESS: 'fff4', 
  COLOR: 'fff5' 
};

@Injectable({
  providedIn: 'root'
})
export class Device extends BaseModel {
  public id: string = '';
  public name: string = '';
  public rssi: number = 0;
  public advertising: number[] = [];
  public services: string[] = [];
  public characteristics: any[] = [];

  constructor(deviceData: Device) {
    super(deviceData); // ✅ Pass data to BaseModel constructor
    Object.assign(this, deviceData); // Optionally assign to current instance
  }

  /**
   * Connect to the BLE device
   */
  public async connect(): Promise<void> {
    try {
      await BleClient.connect(this.id);
      console.log(`Connected to device: ${this.name}`);
    } catch (error) {
      console.error('Connection failed:', error);
      throw error;
    }
  }

  /**
   * Disconnect from the BLE device
   */
  public async disconnect(): Promise<void> {
    try {
      await BleClient.disconnect(this.id);
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
      await this.changeBrightnessLevel(100);
      
      await this.delay(300);
      await this.changeBrightnessLevel(0);
      
      await this.delay(300);
      await this.changeBrightnessLevel(previousBrightnessLevel);
    } catch (error) {
      console.error('Flash operation failed:', error);
      throw error;
    }
  }

  /**
   * Change device color
   */
  public async changeColor(color: Color): Promise<void> {
    try {
      const scaledColor = scaleColor(color);
      const dataView = new DataView(new ArrayBuffer(5));
      
      dataView.setUint8(0, scaledColor.r);
      dataView.setUint8(1, scaledColor.g);
      dataView.setUint8(2, scaledColor.b);
      dataView.setUint8(3, 0);
      dataView.setUint8(4, 0);

      await BleClient.write(
        this.id,
        DEVICE_SERVICE_UUID,
        CHARACTERISTIC_UUID.COLOR,
        dataView
      );
    } catch (error) {
      console.error('Change color failed:', error);
      throw error;
    }
  }

  /**
   * Change device brightness level
   */
  public async changeBrightnessLevel(value: number): Promise<void> {
    try {
      const scaled = Math.floor((254 * value) / 100);
      const dataView = new DataView(new ArrayBuffer(1));
      dataView.setUint8(0, scaled);

      await BleClient.write(
        this.id,
        DEVICE_SERVICE_UUID,
        CHARACTERISTIC_UUID.BRIGHTNESS,
        dataView
      );
    } catch (error) {
      console.error('Change brightness failed:', error);
      throw error;
    }
  }

  /**
   * Change device saturation level
   * Note: This seems to use the same characteristic as brightness - you may want to verify this
   */
  public async changeSaturationLevel(value: number): Promise<void> {
    try {
      const scaled = Math.floor((254 * value) / 100);
      const dataView = new DataView(new ArrayBuffer(1));
      dataView.setUint8(0, scaled);

      await BleClient.write(
        this.id,
        DEVICE_SERVICE_UUID,
        CHARACTERISTIC_UUID.BRIGHTNESS, // Consider using a different characteristic for saturation
        dataView
      );
    } catch (error) {
      console.error('Change saturation failed:', error);
      throw error;
    }
  }

  /**
   * Write to a specific characteristic
   */
  public async writeCharacteristic(characteristicUUID: string, value: any): Promise<void> {
    try {
      let dataView: DataView;

      if (Array.isArray(value)) {
        dataView = new DataView(new ArrayBuffer(5));
        dataView.setUint8(0, scaleValue(value[0]));
        dataView.setUint8(1, scaleValue(value[1]));
        dataView.setUint8(2, scaleValue(value[2]));
        dataView.setUint8(3, value[3] || 0);
        dataView.setUint8(4, value[4] || 0);
      } else {
        dataView = new DataView(new ArrayBuffer(1));
        dataView.setUint8(0, scaleValue(value));
      }

      await BleClient.write(
        this.id,
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
      const lowercasedCharacteristicUUID = characteristicUUID.toLowerCase();
      
      const result = await BleClient.read(
        this.id,
        DEVICE_SERVICE_UUID,
        lowercasedCharacteristicUUID
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
      return connectedDevices.some(device => device.deviceId === this.id);
    } catch (error) {
      console.error('Check connection status failed:', error);
      return false;
    }
  }

  /**
   * Get device services
   */
  public async getServices(): Promise<string[]> {
    try {
      const services = await BleClient.getServices(this.id);
      return services.map(service => service.uuid);
    } catch (error) {
      console.error('Get services failed:', error);
      throw error;
    }
  }

  /**
   * Initialize BLE client (call this before using BLE operations)
   */
  public static async initialize(): Promise<void> {
    try {
      await BleClient.initialize({ androidNeverForLocation: true });
      console.log('BLE Client initialized');
    } catch (error) {
      console.error('BLE initialization failed:', error);
      throw error;
    }
  }

  /**
   * Request BLE permissions (Android)
   */
  public static async requestPermissions(): Promise<void> {
    try {
      await BleClient.requestLEScan(
          {
            // Optional: You can filter for specific services or device names
            // filters: [{ services: ['battery_service'] }],
            allowDuplicates: false,
          },
          (result: ScanResult) => {
            console.log('Discovered device:', result);
            // You can process the result here (e.g., add to a list)
          }
        );

      console.log('BLE permissions granted');
    } catch (error) {
      console.error('BLE permission request failed:', error);
      throw error;
    }
  }

  /**
   * Utility method for delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Utility functions
function scaleValue(value: number): number {
  return Math.floor(value * (254 / 255));
}

function scaleColor(color: Color): Color {
  return new Color(
    scaleValue(color.r),
    scaleValue(color.g),
    scaleValue(color.b)
  );
}

// Export for use in other components
export { BleClient, BleDevice } from '@capacitor-community/bluetooth-le';
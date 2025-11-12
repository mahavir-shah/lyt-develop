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

// const DEVICE_SERVICE_UUID = 'fff0';
/*const CHARACTERISTIC_UUID = { 
  BRIGHTNESS: 'fff4', 
  COLOR: 'fff5',
  SATURATION: 'fff6'
}; */
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
  ANIMATION: '0000fff7-0000-1000-8000-00805f9b34fb'
};

function calculateChecksum(data: Uint8Array): number {
  let checksum = 0;
  for (let i = 0; i < data.length; i++) {
    checksum ^= data[i];
  }
  return checksum & 0xFF;
}

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
  
  constructor(
    deviceData?: Partial<Device>,
    private deviceService?: DevicesService
  ) {
    console.log("deviceData:",deviceData)
    super(deviceData || {}); // Pass deviceData or empty object to BaseModel constructor
    if (deviceData) {
      Object.assign(this, deviceData);
    }
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

      this.changeColor(this.color);
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
   * Change device color
   */
  public async changeColor(color: Color, animationOptions?: AnimationOptions): Promise<void> {
    try {
      this.color = color;
      const scaledColor = scaleColor(color);
      const dataView = new DataView(new ArrayBuffer(5));
      
      dataView.setUint8(0, scaledColor.r);
      dataView.setUint8(1, scaledColor.g);
      dataView.setUint8(2, scaledColor.b);
      dataView.setUint8(3, 0);
      dataView.setUint8(4, 0);

      await BleClient.write(
        this.device.deviceId,
        DEVICE_SERVICE_UUID,
        CHARACTERISTIC_UUID.COLOR,
        dataView
      );
      
      console.log(`Color changed to RGB(${scaledColor.r}, ${scaledColor.g}, ${scaledColor.b})`);
      // If animation options provided, send animation command
      if (animationOptions && animationOptions.type && animationOptions.type !== 'none') {
        await this.delay(100);
        await this.sendAnimation(animationOptions);
      }
    } catch (error) {
      console.error('Change color failed:', error);
      throw error;
    }
  }

  /**
   * Send animation command to device
   */
  public async sendAnimation(options: AnimationOptions): Promise<void> {
    try {
      if (!(await this.isConnected())) {
        throw new Error('Device not connected');
      }

      const animationData = this.buildAnimationCommand(options);
      
      await BleClient.write(
        this.device.deviceId,
        DEVICE_SERVICE_UUID,
        CHARACTERISTIC_UUID.ANIMATION,
        animationData
      );

      console.log(`Animation sent: type=${options.type}, speed=${options.speed || 50}%, brightness=${options.brightness || 255}`);
      this.currentAnimation = options;
    } catch (error) {
      console.error('Send animation failed:', error);
      throw error;
    }
  }

  /**
   * Build animation command with proper data structure
   */
  private buildAnimationCommand(options: AnimationOptions): DataView {
    const animationMap: any = {
      'pulse': 0x01,
      'wave': 0x02,
      'strobe': 0x03,
      'mix': 0x04,
      'none': 0x00
    };

    const animationType = animationMap[options.type || 'none'] || 0x00;
    const speed = options.speed ? Math.round((options.speed / 100) * 255) : 128; // Default 50%
    const brightness = options.brightness || 255;

    // Command structure: [animationType, speed, brightness, 0x00, 0x00]
    const commandData = new Uint8Array(5);
    commandData[0] = animationType;
    commandData[1] = speed;
    commandData[2] = brightness;
    commandData[3] = 0x00;
    commandData[4] = 0x00;

    // Optional: Calculate and append checksum if your device requires it
    const checksum = calculateChecksum(commandData);
    const payload = new Uint8Array(6);
    payload.set(commandData, 0);
    payload[5] = checksum;

    const dataView = new DataView(new ArrayBuffer(6));
    for (let i = 0; i < payload.length; i++) {
      dataView.setUint8(i, payload[i]);
    }

    return dataView;
  }

  /**
   * Stop current animation
   */
  public async stopAnimation(): Promise<void> {
    try {
      await this.sendAnimation({ type: 'none' });
      this.currentAnimation = { type: 'none' };
    } catch (error) {
      console.error('Stop animation failed:', error);
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

  const data = new Uint8Array([r, g, b, 0, 0]);
  await BleClient.write(
    this.device.deviceId,
    DEVICE_SERVICE_UUID,
    CHARACTERISTIC_UUID.COLOR,
    new DataView(data.buffer)
  );
  console.log('Updated the LED brightness to scale, r, g, b', scale, r, g, b);
}


  /**
   * Create brightness command with your checksum format
   */
  private createBrightnessCommand(brightnessValue: number): Uint8Array {
    // Your original format
    const commandData = new Uint8Array(6);
    commandData[0] = 0xAA;
    commandData[1] = 0xBB;
    commandData[2] = 0x01;
    commandData[3] = brightnessValue;
    commandData[4] = 0x00;
    commandData[5] = 0x00;

    // Calculate checksum (XOR of all bytes)
    let checksum = 0;
    for (let i = 0; i < commandData.length; i++) {
      checksum ^= commandData[i];
    }

    // Create final payload with checksum
    const payload = new Uint8Array(7);
    payload.set(commandData, 0);
    payload[6] = checksum;

    return payload;
  }

  /**
   * Change device saturation level
   * Note: Make sure your device actually supports a separate saturation characteristic
   */
  public async changeSaturationLevel(value: number): Promise<void> {
    try {
      // Ensure value is between 0 and 100
      const clampedValue = Math.max(0, Math.min(100, value));
      const scaled = Math.floor((254 * clampedValue) / 100);
      const dataView = new DataView(new ArrayBuffer(1));
      dataView.setUint8(0, scaled);

      // Use a different characteristic for saturation if available
      // Otherwise, you might need to combine this with color data
      await BleClient.write(
        this.device.deviceId,
        DEVICE_SERVICE_UUID,
        CHARACTERISTIC_UUID.SATURATION, // Update this with correct UUID
        dataView
      );
      
      console.log(`Saturation changed to: ${clampedValue}%`);
    } catch (error) {
      console.error('Change saturation failed:', error);
      throw error;
    }
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

  const data = new Uint8Array([r, g, b, 0, 0]);
  await BleClient.write(
    this.device.deviceId,
    DEVICE_SERVICE_UUID,
    CHARACTERISTIC_UUID.COLOR, // 0xFFF5
    new DataView(data.buffer)
  );
  console.log('Updated the saturation to scale, r, g, b', saturation, r, g, b);
}

public async  applyBrightnessAndSaturation(
  baseColor: Color,
  brightness: number, saturation: number
) {
  // Brightness scaling first
  const br = baseColor.r * brightness;
  const bg = baseColor.g * brightness;
  const bb = baseColor.b * brightness;

  // Then apply saturation
  const gray = (br + bg + bb) / 3;
  const newR = Math.round(gray + (br - gray) * saturation);
  const newG = Math.round(gray + (bg - gray) * saturation);
  const newB = Math.round(gray + (bb - gray) * saturation);
  return [newR, newG, newB];
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

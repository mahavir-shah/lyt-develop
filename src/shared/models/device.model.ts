import { 
  BleClient, 
  BleDevice, 
  numberToUUID, 
  ScanResult,
  BleService 
} from '@capacitor-community/bluetooth-le';
import { Color } from './../components/color-wheel/color';
import { BaseModel } from './base.model';

// const DEVICE_SERVICE_UUID = 'fff0';
const DEVICE_SERVICE_UUID = '0000fff0-0000-1000-8000-00805f9b34fb';
/*const CHARACTERISTIC_UUID = { 
  BRIGHTNESS: 'fff4', 
  COLOR: 'fff5',
  // Add a separate characteristic for saturation if available
  SATURATION: 'fff6' // Update this with actual UUID if different
}; */
const CHARACTERISTIC_UUID = { 
  // 0000fff4-0000-1000-8000-00805f9b34fb
  BRIGHTNESS: '0000fff4-0000-1000-8000-00805f9b34fb', 
  
  // 0000fff5-0000-1000-8000-00805f9b34fb
  COLOR: '0000fff5-0000-1000-8000-00805f9b34fb',
  
  // 0000fff6-0000-1000-8000-00805f9b34fb
  SATURATION: '0000fff6-0000-1000-8000-00805f9b34fb' 
};

const calculateChecksum = (data: Uint8Array): number => {
    let checksum = 0;
    // Iterate over all bytes provided
    for (const byte of data) {
        checksum ^= byte;
    }
    return checksum;
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

  constructor(deviceData?: Partial<Device>) {
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
      if(! (await this.isConnected())) {
        await BleClient.connect(this.device.deviceId);
        await this.delay(500);  
      }
      console.log('first brightness call 100')
      await this.changeBrightnessLevel(100);
      await this.delay(1000);
      
      console.log('second brightness call 0')
      await this.changeBrightnessLevel(0);
      await this.delay(1000);
      
      await this.changeBrightnessLevel(previousBrightnessLevel);
      console.log('second brightness call ---' + previousBrightnessLevel)
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
        this.device.deviceId,
        DEVICE_SERVICE_UUID,
        CHARACTERISTIC_UUID.COLOR,
        dataView
      );
      
      console.log(`Color changed to RGB(${scaledColor.r}, ${scaledColor.g}, ${scaledColor.b})`);
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
            // 1. Clamp and Scale Value (0-100% to 0-255)
            const clampedValue = Math.max(0, Math.min(100, value));
            const scaled = Math.floor((255 * clampedValue) / 100);

            // 2. Construct the 6-byte payload (without final checksum)
            const commandData = new Uint8Array(6);
            commandData[0] = 0xAA; // Common Header 1 (Needs verification)
            commandData[1] = 0xBB; // Common Header 2 (Needs verification)
            commandData[2] = 0x01; // Command ID: Set Brightness (Needs verification)
            commandData[3] = scaled; // The brightness value (0-255)
            commandData[4] = 0x00; // Unused Byte 1
            commandData[5] = 0x00; // Unused Byte 2

            // 3. Calculate Checksum (XOR sum of the 6 command bytes)
            const checksum = calculateChecksum(commandData);

            // 4. Create Final 7-byte Packet (Command + Checksum)
            const payload = new Uint8Array(7);
            payload.set(commandData, 0); // Copy the first 6 bytes
            payload[6] = checksum;      // Append the calculated checksum

            // 5. Prepare DataView for BLE write
            const dataView = new DataView(payload.buffer);
            
            // 6. Write to BLE Characteristic
            await BleClient.writeWithoutResponse(
                this.device.deviceId,
                DEVICE_SERVICE_UUID,
                CHARACTERISTIC_UUID.BRIGHTNESS,
                dataView
            );
            
            console.log(`Brightness changed to: ${clampedValue}% (Sent value: ${scaled})`);
            console.log(`Full Packet (Hex): ${Array.from(payload).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')}`);

        } catch (error) {
            console.error('Change brightness failed:', error);
            // Re-throw the error so the caller can handle it
            throw error; 
        }
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
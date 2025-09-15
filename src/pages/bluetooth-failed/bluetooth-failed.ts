import { Component, inject, OnDestroy } from '@angular/core';
import { Platform } from '@ionic/angular';
import { BleClient, ScanResult, BleDevice } from '@capacitor-community/bluetooth-le';
import { Browser } from '@capacitor/browser';
import { Device } from '@capacitor/device';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

@Component({
  selector: 'bluetooth-failed',
  templateUrl: 'bluetooth-failed.html',
  styleUrls: ['bluetooth-failed.sass'],
  standalone: false
})
export class BluetoothFailedPage implements OnDestroy {
  public platform = inject(Platform);
  private alertController = inject(AlertController);
  private loadingController = inject(LoadingController);
  private toastController = inject(ToastController);
  
  public isBluetoothEnabled: boolean = false;
  public isScanning: boolean = false;
  public discoveredDevices: BleDevice[] = [];
  public bluetoothStatus: string = 'Unknown';
  
  private scanSubscription?: Subscription;

  constructor() {
    this.initializeBluetooth();
  }

  ngOnDestroy() {
    this.cleanup();
  }

  /**
   * Initialize Bluetooth on component load
   */
  private async initializeBluetooth(): Promise<void> {
    try {
      await this.checkBluetoothStatus();
    } catch (error) {
      console.error('Failed to initialize Bluetooth:', error);
      this.bluetoothStatus = 'Failed to Initialize';
    }
  }

  /**
   * Show Bluetooth settings
   * Opens device-specific settings based on platform
   */
  public async showBluetoothSettings(): Promise<void> {
    const loading:any = await this.loadingController.create({
      message: 'Opening Bluetooth settings...',
      duration: 2000
    });
    await loading?.then(alert => {
      alert.present();
    });

    try {
      const deviceInfo = await Device.getInfo();
      console.log('Device platform:', deviceInfo.platform);
      
      if (this.platform.is('android')) {
        await this.openAndroidBluetoothSettings();
      } else if (this.platform.is('ios')) {
        await this.openIOSSettings();
      } else {
        console.warn('Platform not supported for opening Bluetooth settings');
        await this.showWebInstructions();
      }
      
      await this.showToast('Settings opened. Please enable Bluetooth and return to the app.');
    } catch (error) {
      console.error('Failed to open Bluetooth settings:', error);
      await this.showErrorAlert('Settings Error', 'Failed to open Bluetooth settings. Please open them manually.');
    } finally {
      await loading.dismiss();
    }
  }

  /**
   * Open Android Bluetooth settings using intent URLs
   */
  private async openAndroidBluetoothSettings(): Promise<void> {
    const settingsAttempts = [
      {
        name: 'Bluetooth Settings',
        url: 'intent:///#Intent;action=android.settings.BLUETOOTH_SETTINGS;end'
      },
      {
        name: 'Wireless Settings', 
        url: 'intent:///#Intent;action=android.settings.WIRELESS_SETTINGS;end'
      },
      {
        name: 'Application Details',
        url: 'intent:///#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;end'
      },
      {
        name: 'General Settings',
        url: 'intent:///#Intent;action=android.settings.SETTINGS;end'
      }
    ];

    for (const attempt of settingsAttempts) {
      try {
        console.log(`Trying to open: ${attempt.name}`);
        await Browser.open({ 
          url: attempt.url,
          windowName: '_system'
        });
        return; // Success, exit the loop
      } catch (error) {
        console.error(`Failed to open ${attempt.name}:`, error);
        continue; // Try next option
      }
    }

    throw new Error('Unable to open any Android settings');
  }

  /**
   * Open iOS Settings app
   */
  private async openIOSSettings(): Promise<void> {
    const iosSettingsAttempts = [
      'App-Prefs:Bluetooth',
      'App-Prefs:root=Bluetooth',
      'prefs:root=Bluetooth', 
      'app-settings:',
      'prefs:'
    ];

    for (const settingsUrl of iosSettingsAttempts) {
      try {
        console.log(`Trying iOS settings: ${settingsUrl}`);
        await Browser.open({ 
          url: settingsUrl,
          windowName: '_system'
        });
        return; // Success
      } catch (error) {
        console.error(`Failed to open iOS settings with ${settingsUrl}:`, error);
        continue;
      }
    }

    throw new Error('Unable to open iOS settings');
  }

  /**
   * Show instructions for web/desktop users
   */
  private async showWebInstructions(): Promise<void> {
    const alert:any = await this.alertController.create({
      header: 'Enable Bluetooth',
      message: `
        <p>Please enable Bluetooth manually:</p>
        <ul>
          <li><strong>Windows:</strong> Settings > Devices > Bluetooth & other devices</li>
          <li><strong>macOS:</strong> System Preferences > Bluetooth</li>
          <li><strong>Linux:</strong> System Settings > Bluetooth</li>
        </ul>
      `,
      buttons: ['OK']
    });
    await alert?.then(alert => {
      alert.present();
    });
  }

  /**
   * Check if Bluetooth is enabled and available
   */
  public async checkBluetoothStatus(): Promise<boolean> {
    try {
      // Initialize BLE client
      await BleClient.initialize({ 
        androidNeverForLocation: true 
      });
      
      // Check if Bluetooth is enabled
      const isEnabled = await BleClient.isEnabled();
      this.isBluetoothEnabled = isEnabled;
      this.bluetoothStatus = isEnabled ? 'Enabled' : 'Disabled';
      
      console.log('Bluetooth enabled:', isEnabled);
      
      if (!isEnabled) {
        await this.showToast('Bluetooth is disabled. Please enable it in settings.');
      }
      
      return isEnabled;
    } catch (error) {
      console.error('Bluetooth not available:', error);
      this.isBluetoothEnabled = false;
      this.bluetoothStatus = 'Not Available';
      return false;
    }
  }

  /**
   * Request Bluetooth permissions
   */
  public async requestBluetoothPermissions(): Promise<boolean> {
    const loading:any = await this.loadingController.create({
      message: 'Requesting Bluetooth permissions...'
    });
    await loading?.then(alert => {
      alert.present();
    });

    try {
      if (this.platform.is('android')) {
        await BleClient.initialize({ androidNeverForLocation: true });
        
        // Test permissions by attempting a brief scan
        const permissionGranted = await this.testBluetoothPermissions();
        
        if (permissionGranted) {
          await this.showToast('Bluetooth permissions granted!');
          await this.checkBluetoothStatus();
          return true;
        } else {
          await this.showErrorAlert(
            'Permissions Required', 
            'Bluetooth permissions are required for this app to function. Please grant permissions in the next dialog.'
          );
          return false;
        }
      } else {
        // iOS handles permissions automatically
        console.log('Bluetooth permissions handled automatically on iOS');
        await this.showToast('Bluetooth permissions handled automatically');
        return true;
      }
    } catch (error) {
      console.error('Failed to request Bluetooth permissions:', error);
      await this.showErrorAlert('Permission Error', 'Failed to request Bluetooth permissions.');
      return false;
    } finally {
      await loading.dismiss();
    }
  }

  /**
   * Test Bluetooth permissions with a brief scan
   */
  private async testBluetoothPermissions(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      let permissionGranted = false;
      
      const timeout = setTimeout(() => {
        if (!permissionGranted) {
          BleClient.stopLEScan().catch(() => {});
          resolve(true); // Assume granted if no error after timeout
        }
      }, 3000);

      BleClient.requestLEScan(
        { allowDuplicates: false },
        (result: ScanResult) => {
          if (!permissionGranted) {
            permissionGranted = true;
            clearTimeout(timeout);
            BleClient.stopLEScan().then(() => {
              resolve(true);
            });
          }
        }
      ).catch((error) => {
        clearTimeout(timeout);
        console.error('Permission test failed:', error);
        resolve(false);
      });
    });
  }

  /**
   * Start scanning for Bluetooth devices
   */
  public async startDeviceScan(): Promise<void> {
    if (this.isScanning) {
      await this.stopDeviceScan();
      return;
    }

    try {
      // Check Bluetooth status first
      const isEnabled = await this.checkBluetoothStatus();
      if (!isEnabled) {
        await this.showErrorAlert('Bluetooth Disabled', 'Please enable Bluetooth first.');
        return;
      }

      this.isScanning = true;
      this.discoveredDevices = [];
      
      await this.showToast('Scanning for devices...');

      await BleClient.requestLEScan(
        {
          allowDuplicates: false,
        },
        (result: ScanResult) => {
          console.log('Discovered device:', result);
          
          // Add device if not already in list
          const existingDevice = this.discoveredDevices.find(
            device => device.deviceId === result.device.deviceId
          );
          
          if (!existingDevice) {
            this.discoveredDevices.push(result.device);
          }
        }
      );

      // Stop scanning after 10 seconds
      setTimeout(async () => {
        await this.stopDeviceScan();
      }, 10000);

    } catch (error) {
      console.error('Failed to start device scan:', error);
      this.isScanning = false;
      await this.showErrorAlert('Scan Error', 'Failed to start Bluetooth scan.');
    }
  }

  /**
   * Stop scanning for devices
   */
  public async stopDeviceScan(): Promise<void> {
    try {
      await BleClient.stopLEScan();
      this.isScanning = false;
      await this.showToast(`Scan completed. Found ${this.discoveredDevices.length} devices.`);
    } catch (error) {
      console.error('Failed to stop scan:', error);
      this.isScanning = false;
    }
  }

  /**
   * Enable Bluetooth (Android only - limited support)
   */
  public async enableBluetooth(): Promise<boolean> {
    const loading:any = await this.loadingController.create({
      message: 'Attempting to enable Bluetooth...'
    });
    await loading?.then(alert => {
      alert.present();
    });

    try {
      if (this.platform.is('android')) {
        await BleClient.enable();
        await this.checkBluetoothStatus();
        
        if (this.isBluetoothEnabled) {
          await this.showToast('Bluetooth enabled successfully!');
          return true;
        } else {
          await this.showToast('Could not enable Bluetooth automatically.');
          return false;
        }
      } else {
        await this.showToast('Automatic Bluetooth enable not supported on this platform.');
        return false;
      }
    } catch (error) {
      console.error('Failed to enable Bluetooth:', error);
      await this.showErrorAlert(
        'Enable Failed', 
        'Could not enable Bluetooth automatically. Please enable it manually in settings.'
      );
      return false;
    } finally {
      await loading.dismiss();
    }
  }

  /**
   * Complete Bluetooth setup flow
   */
  public async setupBluetooth(): Promise<boolean> {
    const loading:any = await this.loadingController.create({
      message: 'Setting up Bluetooth...'
    });
    await loading?.then(alert => {
      alert.present();
    });

    try {
      // Step 1: Check if Bluetooth is available
      console.log('Step 1: Checking Bluetooth status...');
      const isAvailable = await this.checkBluetoothStatus();
      
      if (!isAvailable) {
        console.log('Step 2: Bluetooth not available, requesting permissions...');
        
        const permissionsGranted = await this.requestBluetoothPermissions();
        
        if (!permissionsGranted) {
          console.log('Step 3: Permissions not granted, opening settings...');
          await loading.dismiss();
          await this.showBluetoothSettings();
          return false;
        }
        
        // Step 4: Try to enable Bluetooth
        console.log('Step 4: Attempting to enable Bluetooth...');
        const enabled = await this.enableBluetooth();
        
        if (!enabled) {
          console.log('Step 5: Could not enable automatically, opening settings...');
          await loading.dismiss();
          await this.showBluetoothSettings();
          return false;
        }
      }
      
      await loading.dismiss();
      await this.showToast('Bluetooth setup completed successfully!');
      console.log('Bluetooth setup completed successfully');
      return true;
      
    } catch (error) {
      console.error('Bluetooth setup failed:', error);
      await loading.dismiss();
      await this.showErrorAlert('Setup Failed', 'Bluetooth setup failed. Please try again.');
      return false;
    }
  }

  /**
   * Refresh Bluetooth status
   */
  public async refreshBluetoothStatus(): Promise<void> {
    const loading:any = await this.loadingController.create({
      message: 'Checking Bluetooth status...',
      duration: 2000
    });
    await loading?.then(alert => {
      alert.present();
    });
    
    await this.checkBluetoothStatus();
    await loading.dismiss();
  }

  /**
   * Connect to a specific Bluetooth device
   */
  public async connectToDevice(deviceId: string): Promise<boolean> {
    const loading:any = await this.loadingController.create({
      message: 'Connecting to device...'
    });
    await loading?.then(alert => {
      alert.present();
    });

    try {
      await BleClient.connect(deviceId, (deviceId) => {
        console.log(`Device ${deviceId} disconnected`);
      });
      
      await this.showToast('Device connected successfully!');
      return true;
    } catch (error) {
      console.error('Failed to connect to device:', error);
      await this.showErrorAlert('Connection Failed', 'Could not connect to the selected device.');
      return false;
    } finally {
      await loading.dismiss();
    }
  }

  /**
   * Disconnect from a Bluetooth device
   */
  public async disconnectFromDevice(deviceId: string): Promise<void> {
    try {
      await BleClient.disconnect(deviceId);
      await this.showToast('Device disconnected successfully!');
    } catch (error) {
      console.error('Failed to disconnect from device:', error);
      await this.showErrorAlert('Disconnect Failed', 'Could not disconnect from the device.');
    }
  }

  /**
   * Get connected devices
   */
  public async getConnectedDevices(): Promise<BleDevice[]> {
    try {
      const devices = await BleClient.getConnectedDevices([]);
      console.log('Connected devices:', devices);
      return devices;
    } catch (error) {
      console.error('Failed to get connected devices:', error);
      return [];
    }
  }

  /**
   * Check if device is connected
   */
  public async isDeviceConnected(deviceId: string): Promise<boolean> {
    try {
      const connectedDevices = await this.getConnectedDevices();
      return connectedDevices.some(device => device.deviceId === deviceId);
    } catch (error) {
      console.error('Failed to check device connection:', error);
      return false;
    }
  }

  /**
   * Show error alert
   */
  private async showErrorAlert(header: string, message: string): Promise<void> {
    const alert:any = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert?.then(alert => {
      alert.present();
    });
  }

  /**
   * Show confirmation alert
   */
  private async showConfirmAlert(header: string, message: string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.alertController.create({
        header,
        message,
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel',
            handler: () => resolve(false)
          },
          {
            text: 'OK',
            handler: () => resolve(true)
          }
        ]
      }).then(alert => alert.present());
    });
  }

  /**
   * Show toast message
   */
  private async showToast(message: string, duration: number = 3000): Promise<void> {
    const toast:any = await this.toastController.create({
      message,
      duration,
      position: 'bottom'
    });
    await toast?.then(alert => {
      alert.present();
    });
  }

  /**
   * Handle app pause/resume for Bluetooth state
   */
  public async handleAppStateChange(isActive: boolean): Promise<void> {
    if (isActive) {
      // App became active, refresh Bluetooth status
      await this.checkBluetoothStatus();
    } else {
      // App became inactive, stop scanning if active
      if (this.isScanning) {
        await this.stopDeviceScan();
      }
    }
  }

  /**
   * Reset Bluetooth connection
   */
  public async resetBluetooth(): Promise<void> {
    const loading:any = await this.loadingController.create({
      message: 'Resetting Bluetooth...'
    });
    await loading?.then(alert => {
      alert.present();
    });

    try {
      // Stop any ongoing scans
      if (this.isScanning) {
        await this.stopDeviceScan();
      }

      // Disconnect from all devices
      const connectedDevices = await this.getConnectedDevices();
      for (const device of connectedDevices) {
        await this.disconnectFromDevice(device.deviceId);
      }

      // Reinitialize
      await this.initializeBluetooth();
      
      await this.showToast('Bluetooth reset completed!');
    } catch (error) {
      console.error('Failed to reset Bluetooth:', error);
      await this.showErrorAlert('Reset Failed', 'Could not reset Bluetooth connection.');
    } finally {
      await loading.dismiss();
    }
  }

  /**
   * Get device RSSI (signal strength)
   */
  public async getDeviceRSSI(deviceId: string): Promise<number | null> {
    try {
      const rssi = await BleClient.readRssi(deviceId);
      return rssi;
    } catch (error) {
      console.error('Failed to read RSSI:', error);
      return null;
    }
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    try {
      if (this.isScanning) {
        await BleClient.stopLEScan();
      }
      this.scanSubscription?.unsubscribe();
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
}
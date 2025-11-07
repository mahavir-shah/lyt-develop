import { Component, inject, OnDestroy } from '@angular/core';
import { Platform } from '@ionic/angular';
import { BleClient, ScanResult, BleDevice } from '@capacitor-community/bluetooth-le';
import { Device } from '@capacitor/device';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
@Component({
  selector: 'bluetooth-failed',
  templateUrl: 'bluetooth-failed.html',
  styleUrls: ['bluetooth-failed.css'],
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

  constructor(private router: Router) {
    
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
      const status = await this.checkBluetoothStatus();
      if (status) {
        this.router.navigateByUrl('/search-inprogress-page');
      }
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
    try {
      const deviceInfo = await Device.getInfo();
      console.log('Device platform:', deviceInfo.platform);
      
      if (this.platform.is('android')) {
        // First, try to use BleClient.enable() which prompts user
        const shouldEnable = await this.showConfirmAlert(
          'Enable Bluetooth',
          'This app needs Bluetooth to be enabled. Would you like to enable it now?'
        );
        
        if (shouldEnable) {
          const enableResult = await this.enableBluetooth();
          if (!enableResult) {
            // If enable failed, show manual instructions
            await this.openAndroidBluetoothSettings();
          } else {
            this.router.navigateByUrl('/search-inprogress-page');
            // await this.showToast('Bluetooth enabled successfully!');
          }
        } else {
          await this.openAndroidBluetoothSettings();
        }
      } else if (this.platform.is('ios')) {
        await this.openIOSSettings();
      } else {
        await this.showWebInstructions();
      }
      
    } catch (error) {
      console.error('Failed to open Bluetooth settings:', error);
      await this.openAndroidBluetoothSettings();
    }
  }

  /**
   * Open Android Bluetooth settings
   * Uses the most reliable method: showing user instructions
   */
  private async openAndroidBluetoothSettings(): Promise<void> {
    // Show manual instructions - most reliable method
    await this.showManualSettingsInstructions();
  }

  /**
   * Show manual instructions for opening Bluetooth settings on Android
   */
  private async showManualSettingsInstructions(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Enable Bluetooth',
      cssClass: 'bluetooth-instructions-alert',
      message: `
        <div style="text-align: left;">
          <p><strong>Quick Method:</strong></p>
          <ol style="padding-left: 20px; margin: 10px 0;">
            <li>Swipe down from the top of your screen twice</li>
            <li>Tap the <strong>Bluetooth</strong> icon to turn it on</li>
          </ol>
          
          <p><strong>Or through Settings:</strong></p>
          <ol style="padding-left: 20px; margin: 10px 0;">
            <li>Open <strong>Settings</strong></li>
            <li>Tap <strong>Connected devices</strong></li>
            <li>Tap <strong>Connection preferences</strong></li>
            <li>Tap <strong>Bluetooth</strong> and turn it on</li>
          </ol>
          
          <p style="margin-top: 15px;"><em>After enabling, return to this app and tap "Check Bluetooth Status"</em></p>
        </div>
      `,
      buttons: [
        {
          text: 'I Understand',
          role: 'confirm',
          cssClass: 'primary-button'
        }
      ]
    });
    await alert.present();
  }

  /**
   * Open iOS Settings app
   */
  private async openIOSSettings(): Promise<void> {
    // iOS doesn't allow direct opening of Bluetooth settings
    // Show instructions instead
    const alert = await this.alertController.create({
      header: 'Enable Bluetooth',
      cssClass: 'custom-color-alert',
      message: `
        <p><strong>Please enable Bluetooth:</strong></p>
        <ol style="text-align: left; padding-left: 20px;">
          <li>Swipe down from the top-right corner</li>
          <li>Tap and hold the <strong>Bluetooth</strong> icon</li>
          <li>Or go to: <strong>Settings → Bluetooth</strong></li>
          <li>Turn on <strong>Bluetooth</strong></li>
          <li>Return to this app</li>
        </ol>
      `,
      buttons: ['OK']
    });
    await alert.present();
  }

  /**
   * Show instructions for web/desktop users
   */
  private async showWebInstructions(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Enable Bluetooth',
      cssClass: 'custom-color-alert',
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
    await alert.present();
  }

  /**
   * Check if Bluetooth is enabled and available
   */
  public async checkBluetoothStatus(): Promise<boolean> {
    try {
      await BleClient.initialize({ 
        androidNeverForLocation: true 
      });
        
      this.isBluetoothEnabled = await BleClient.isEnabled();

      if (this.isBluetoothEnabled) {
        this.bluetoothStatus = 'Enabled';
        return true;
      } else {
        this.isBluetoothEnabled = false;
        this.bluetoothStatus = 'Disabled';
        return false;
      }
    } catch (error) {
      console.error('Error checking Bluetooth status:', error);
      this.bluetoothStatus = 'Error';
      return false;
    }
  }

  /**
   * Request Bluetooth permissions and enable if needed
   */
  public async requestBluetoothPermissions(): Promise<boolean> {
    const loading = await this.loadingController.create({
      message: 'Requesting Bluetooth permissions...'
    });
    await loading.present();

    try {
      if (this.platform.is('android')) {
        // Initialize first
        await BleClient.initialize({ androidNeverForLocation: true });
        
        // Check if already enabled
        const isEnabled = await BleClient.isEnabled();
        
        if (!isEnabled) {
          // Try to enable Bluetooth - this will trigger permission request
          try {
            await BleClient.enable();
            await this.showToast('Bluetooth enabled successfully!');
            await this.checkBluetoothStatus();
            return true;
          } catch (enableError) {
            console.log('Enable error, opening settings:', enableError);
            await loading.dismiss();
            await this.showBluetoothSettings();
            return false;
          }
        }
        
        // Test permissions by attempting a brief scan
        const permissionGranted = await this.testBluetoothPermissions();
        
        if (permissionGranted) {
          await this.showToast('Bluetooth permissions granted!');
          await this.checkBluetoothStatus();
          return true;
        } else {
          await this.showErrorAlert(
            'Permissions Required', 
            'Bluetooth permissions are required. Please grant them in the next dialog.'
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
        const userWantsToEnable = await this.showConfirmAlert(
          'Bluetooth Disabled',
          'Bluetooth is currently disabled. Would you like to enable it?'
        );
        
        if (userWantsToEnable) {
          await this.setupBluetooth();
        }
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
            (device) => device.deviceId === result.device.deviceId
          );
          
          if (!existingDevice) {
            this.discoveredDevices.push(result.device);
            console.log(`Added device: ${result.device.name || 'Unknown'} (${result.device.deviceId})`);
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
      
      // Check if it's a permission error
      const errorMessage = (error as Error).message || '';
      if (errorMessage.includes('permission') || errorMessage.includes('Permission')) {
        await this.showErrorAlert(
          'Permission Required',
          'Bluetooth permissions are required to scan for devices.'
        );
        await this.requestBluetoothPermissions();
      } else {
        await this.showErrorAlert('Scan Error', 'Failed to start Bluetooth scan. Please ensure Bluetooth is enabled.');
      }
    }
  }

  /**
   * Stop scanning for devices
   */
  public async stopDeviceScan(): Promise<void> {
    try {
      await BleClient.stopLEScan();
      this.isScanning = false;
      await this.showToast(`Scan completed. Found ${this.discoveredDevices.length} device(s).`);
    } catch (error) {
      console.error('Failed to stop scan:', error);
      this.isScanning = false;
    }
  }

  /**
   * Enable Bluetooth (Android only - limited support)
   */
  public async enableBluetooth(): Promise<boolean> {
    try {
      if (this.platform.is('android')) {
        console.log('Attempting to enable Bluetooth...');
        
        // Check current status first
        const currentStatus = await BleClient.isEnabled();
        console.log('Current Bluetooth status:', currentStatus);
        
        if (currentStatus) {
          await this.showToast('Bluetooth is already enabled!');
          return true;
        }
        
        // Show loading
        const loading = await this.loadingController.create({
          message: 'Requesting Bluetooth access...'
        });
        await loading.present();
        
        try {
          // This should trigger the system dialog
          console.log('Calling BleClient.enable()...');
          await BleClient.enable();
          
          // Wait for user action
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Check if it was enabled
          const newStatus = await BleClient.isEnabled();
          console.log('New Bluetooth status:', newStatus);
          
          await loading.dismiss();
          
          if (newStatus) {
            this.isBluetoothEnabled = true;
            this.bluetoothStatus = 'Enabled';
            await this.showToast('Bluetooth enabled successfully!');
            return true;
          } else {
            await this.showToast('Bluetooth was not enabled. Please enable it manually.');
            return false;
          }
        } catch (enableError) {
          await loading.dismiss();
          console.error('BleClient.enable() error:', enableError);
          
          // Check if error is because user denied
          const errorMsg = (enableError as Error).message || '';
          if (errorMsg.includes('denied') || errorMsg.includes('cancelled')) {
            await this.showToast('Bluetooth enable request was denied.');
          } else {
            await this.showToast('Could not enable Bluetooth automatically.');
          }
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
    }
  }

  /**
   * Complete Bluetooth setup flow
   */
  public async setupBluetooth(): Promise<boolean> {
    const loading = await this.loadingController.create({
      message: 'Setting up Bluetooth...'
    });
    await loading.present();

    try {
      // Step 1: Initialize
      console.log('Step 1: Initializing Bluetooth...');
      await BleClient.initialize({ androidNeverForLocation: true });
      
      // Step 2: Check if Bluetooth is available
      console.log('Step 2: Checking Bluetooth status...');
      const isAvailable = await this.checkBluetoothStatus();
      
      if (!isAvailable) {
        console.log('Step 3: Bluetooth not enabled, attempting to enable...');
        
        // Try to enable Bluetooth
        const enabled = await this.enableBluetooth();
        
        if (!enabled) {
          console.log('Step 4: Could not enable automatically, opening settings...');
          await loading.dismiss();
          await this.showBluetoothSettings();
          return false;
        }
      }
      
      // Step 5: Request permissions if needed
      console.log('Step 5: Testing permissions...');
      const permissionGranted = await this.testBluetoothPermissions();
      
      if (!permissionGranted) {
        console.log('Step 6: Permissions not granted, requesting...');
        await loading.dismiss();
        return await this.requestBluetoothPermissions();
      }
      
      await loading.dismiss();
      // await this.showToast('Bluetooth setup completed successfully!');
      console.log('Bluetooth setup completed successfully');
      return true;
      
    } catch (error) {
      console.error('Bluetooth setup failed:', error);
      await loading.dismiss();
      await this.showErrorAlert('Setup Failed', 'Bluetooth setup failed. Please try manually enabling Bluetooth in settings.');
      return false;
    }
  }

  /**
   * Refresh Bluetooth status
   */
  public async refreshBluetoothStatus(): Promise<void> {
    const loading = await this.loadingController.create({
      message: 'Checking Bluetooth status...',
      duration: 2000
    });
    await loading.present();
    
    await this.checkBluetoothStatus();
    await loading.dismiss();
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
      return connectedDevices.some((device) => device.deviceId === deviceId);
    } catch (error) {
      console.error('Failed to check device connection:', error);
      return false;
    }
  }

  /**
   * Show error alert
   */
  private async showErrorAlert(header: string, message: string): Promise<void> {
    const alert = await this.alertController.create({
      header,
      cssClass: 'custom-color-alert',
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  /**
   * Show confirmation alert
   */
  private async showConfirmAlert(header: string, message: string): Promise<boolean> {
    return new Promise<boolean>(async (resolve) => {
      const alert = await this.alertController.create({
        header,
        cssClass: 'custom-color-alert',
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
      });
      await alert.present();
    });
  }

  /**
   * Show toast message
   */
  private async showToast(message: string, duration: number = 3000): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration,
      position: 'bottom'
    });
    await toast.present();
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
    const loading = await this.loadingController.create({
      message: 'Resetting Bluetooth...'
    });
    await loading.present();

    try {
      // Stop any ongoing scans
      if (this.isScanning) {
        await this.stopDeviceScan();
      }

      // Disconnect from all devices
      const connectedDevices = await this.getConnectedDevices();
      for (const device of connectedDevices) {
        if (device && device.deviceId) {
          await this.disconnectFromDevice(device.deviceId);
        }
      }

      // Reinitialize
      await this.initializeBluetooth();
      
      // await this.showToast('Bluetooth reset completed!');
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
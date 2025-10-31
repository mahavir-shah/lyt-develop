import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { BluetoothLe, ScanResult } from '@capacitor-community/bluetooth-le';
import * as _ from 'lodash';
import { Device } from '../../shared/models/device.model';
import { DevicesService } from '../../shared/services/devices.service';
import { Subscription, timer } from 'rxjs';
import { take } from 'rxjs/operators';

@Component({
  selector: 'search-in-progress',
  templateUrl: 'search-in-progress.html',
  standalone: false,
})
export class SearchInProgressPage implements OnDestroy {
  private ticks = 10;
  private timerSubscription?: Subscription;
  private scanListener: any;
  public remainingSeconds = 10; // For display in template

  constructor(
    public devicesService: DevicesService,
    public navCtrl: NavController
  ) {}

  /* async ngOnInit() {
    console.log('SearchInProgressPage initialized');
    await this.startScan();
  } */
  
  async ionViewWillEnter() {
    console.log('SearchInProgressPage is about to be shown (ionViewWillEnter)');
    await this.startScan();
  }

  ngOnDestroy() {
    console.log('SearchInProgressPage destroyed');
    this.cleanup();
  }

  /**
   * Start the Bluetooth scan and timer
   */
  private async startScan() {
    // Reset state every time
    this.ticks = 10;
    this.remainingSeconds = 10;
    this.devicesService.devices = [];

    // Clean up any existing scan/timer first
    await this.cleanup();

    try {
      console.log('Initializing Bluetooth...');
      await BluetoothLe.initialize();
      
      console.log('Starting BLE scan...');
      await BluetoothLe.requestLEScan({ 
        allowDuplicates: false,
        scanMode: 'lowLatency' as any
      });

      // Add scan result listener
      this.scanListener = await BluetoothLe.addListener(
        'onScanResult', 
        (result: ScanResult) => {
          this.handleDeviceFound(result);
        }
      );

      console.log('Starting 10-second timer...');
      // Start the countdown timer
      this.timerSubscription = timer(0, 1000)
        .pipe(take(11)) // 0 to 10 = 11 ticks
        .subscribe({
          next: (tick) => {
            this.onTimerTick(tick);
          },
          complete: () => {
            console.log('Timer completed after 10 seconds');
            this.stopScan();
          }
        });

    } catch (error) {
      console.error('BLE scan failed:', error);
      await this.cleanup();
      this.goToSearchFailedPage();
    }
  }

  /**
   * Handle discovered device
   */
  private handleDeviceFound(result: any) {
    try {
      if (!result || !result.device) {
        console.warn('Invalid scan result:', result);
        return;
      }

      console.log('Device found:', result.device.name || 'Unknown', result.device.deviceId);

      // Check if device already exists
      const exists = this.devicesService.devices.some(
        (d: Device) => d.device?.deviceId === result.device.deviceId
      );

      if (!exists) {
        const newDevice = new Device(result);
        this.devicesService.devices.push(newDevice);
        console.log(`Added device. Total devices: ${this.devicesService.devices.length}`);
      }
    } catch (error) {
      console.error('Error handling device:', error);
    }
  }

  /**
   * Handle timer tick
   */
  private onTimerTick(tick: number) {
    this.remainingSeconds = 10 - tick;
    console.log(`Scanning... ${this.remainingSeconds} seconds remaining`);
  }

  /**
   * Stop the BLE scan
   */
  private async stopScan() {
    console.log('Stopping scan...');
    
    try {
      // Stop the BLE scan
      await BluetoothLe.stopLEScan();
      console.log('BLE scan stopped');

      // Remove listener
      if (this.scanListener) {
        await this.scanListener.remove();
        this.scanListener = null;
        console.log('Scan listener removed');
      }

      // Unsubscribe timer
      if (this.timerSubscription && !this.timerSubscription.closed) {
        this.timerSubscription.unsubscribe();
        this.timerSubscription = undefined;
        console.log('Timer unsubscribed');
      }

      // Handle results
      this.handleStopScan();

    } catch (error) {
      console.error('Error stopping scan:', error);
      await this.cleanup();
      this.goToSearchFailedPage();
    }
  }

  /**
   * Clean up resources
   */
  private async cleanup() {
    console.log('Cleaning up resources...');

    try {
      // Unsubscribe timer
      if (this.timerSubscription && !this.timerSubscription.closed) {
        this.timerSubscription.unsubscribe();
        this.timerSubscription = undefined;
      }

      // Remove scan listener
      if (this.scanListener) {
        try {
          await this.scanListener.remove();
        } catch (e) {
          console.warn('Error removing listener:', e);
        }
        this.scanListener = null;
      }

      // Stop scan if running
      try {
        await BluetoothLe.stopLEScan();
      } catch (e) {
        // Scan might not be running, ignore error
        console.debug('Stop scan cleanup:', e);
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  /**
   * Handle scan completion
   */
  private handleStopScan() {
    console.log(`Scan complete. Found ${this.devicesService.devices.length} device(s)`);

    if (this.devicesService.devices.length > 0) {
      // Sort devices by signal strength (RSSI)
      this.devicesService.devices = _.orderBy(
        this.devicesService.devices, 
        ['rssi'], 
        ['desc']
      );
      
      console.log('Navigating to devices list...');
      this.goToDevicesListPage();
    } else {
      console.log('No devices found, navigating to failed page...');
      this.goToSearchFailedPage();
    }
  }

  /**
   * Navigate to devices list page
   */
  private goToDevicesListPage() {
    this.navCtrl.navigateForward('/devices-list');
  }

  /**
   * Navigate to search failed page
   */
  private goToSearchFailedPage() {
    this.navCtrl.navigateForward('/search-failed-page');
  }

  /**
   * Manual retry - can be called from template
   */
  public async retry() {
    console.log('Retrying scan...');
    await this.startScan();
  }

  /**
   * Cancel scan - can be called from template
   */
  public async cancel() {
    console.log('Cancelling scan...');
    await this.stopScan();
    this.navCtrl.back();
  }
}